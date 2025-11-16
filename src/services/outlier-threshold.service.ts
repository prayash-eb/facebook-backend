import { OutlierThreshold, type IOutlierThreshold } from "../models/outlier_threshold.model.js";
import { logServiceOperation, logCacheOperation, logError } from "../utils/logger.js";

/**
 * Outlier Threshold Service
 * Manages threshold configuration with caching for performance
 */

interface ThresholdConfig {
    reactionThreshold: number;
    commentThreshold: number;
    shareThreshold: number;
    version: number;
    _id: string;
}

class OutlierThresholdService {
    private cachedThreshold: ThresholdConfig | null = null;
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get current threshold configuration
     * Uses cache if available and not expired
     */
    async getCurrentThreshold(): Promise<ThresholdConfig | null> {
        const now = Date.now();

        // Return cached threshold if still valid
        if (this.cachedThreshold && (now - this.cacheTimestamp) < this.CACHE_TTL) {
            logCacheOperation('hit', 'outlier-threshold');
            return this.cachedThreshold;
        }

        logCacheOperation('miss', 'outlier-threshold');
        logServiceOperation('OutlierThresholdService', 'Fetching threshold from database');

        // Fetch the enabled threshold from database
        const threshold = await OutlierThreshold.findOne({ enabled: true });

        if (threshold) {
            this.cachedThreshold = {
                reactionThreshold: threshold.reactionThreshold,
                commentThreshold: threshold.commentThreshold,
                shareThreshold: threshold.shareThreshold,
                version: threshold.version,
                _id: threshold._id?.toString() || ''
            };
            this.cacheTimestamp = now;
            logCacheOperation('set', 'outlier-threshold', { version: threshold.version });
        }

        return this.cachedThreshold;
    }

    /**
     * Get reaction threshold with fallback to default
     */
    async getReactionThreshold(): Promise<number> {
        const threshold = await this.getCurrentThreshold();
        return threshold?.reactionThreshold || 1000;
    }

    /**
     * Get comment threshold with fallback to default
     */
    async getCommentThreshold(): Promise<number> {
        const threshold = await this.getCurrentThreshold();
        return threshold?.commentThreshold || 1000;
    }

    /**
     * Get share threshold with fallback to default
     */
    async getShareThreshold(): Promise<number> {
        const threshold = await this.getCurrentThreshold();
        return threshold?.shareThreshold || 500;
    }

    /**
     * Check if a count has reached outlier status for reactions
     */
    async isReactionOutlier(count: number): Promise<boolean> {
        const threshold = await this.getReactionThreshold();
        return count >= threshold;
    }

    /**
     * Check if a count has reached outlier status for comments
     */
    async isCommentOutlier(count: number): Promise<boolean> {
        const threshold = await this.getCommentThreshold();
        return count >= threshold;
    }

    /**
     * Check if a count has reached outlier status for shares
     */
    async isShareOutlier(count: number): Promise<boolean> {
        const threshold = await this.getShareThreshold();
        return count >= threshold;
    }

    /**
     * Invalidate cache (call this when threshold is updated)
     */
    invalidateCache(): void {
        logCacheOperation('invalidate', 'outlier-threshold');
        this.cachedThreshold = null;
        this.cacheTimestamp = 0;
    }

    /**
     * Create new threshold configuration
     */
    async createThreshold(data: {
        reactionThreshold: number;
        commentThreshold: number;
        shareThreshold: number;
        version: number;
        enabled?: boolean;
    }): Promise<any> {
        logServiceOperation('OutlierThresholdService', 'Creating new threshold', { version: data.version });

        // Validate thresholds are positive
        if (data.reactionThreshold < 1 || data.commentThreshold < 1 || data.shareThreshold < 1) {
            logError('Threshold creation failed', new Error('Invalid threshold values'), data);
            throw new Error("Thresholds must be positive numbers");
        }

        // Check if version already exists
        const existingVersion = await OutlierThreshold.findOne({ version: data.version });
        if (existingVersion) {
            logError('Threshold creation failed', new Error('Version already exists'), { version: data.version });
            throw new Error(`Threshold version ${data.version} already exists`);
        }

        // If this threshold should be enabled, disable all others
        if (data.enabled) {
            await OutlierThreshold.updateMany({}, { enabled: false });
            logServiceOperation('OutlierThresholdService', 'Disabled all existing thresholds');
        }

        const threshold = await OutlierThreshold.create(data);
        logServiceOperation('OutlierThresholdService', 'Threshold created successfully', { 
            version: data.version,
            id: threshold._id,
            enabled: data.enabled || false
        });
        this.invalidateCache();
        return threshold;
    }

    /**
     * Update existing threshold
     */
    async updateThreshold(thresholdId: string, data: Partial<{
        reactionThreshold: number;
        commentThreshold: number;
        shareThreshold: number;
        enabled: boolean;
    }>): Promise<any> {
        // Validate thresholds are positive
        if (data.reactionThreshold !== undefined && data.reactionThreshold < 1) {
            throw new Error("Reaction threshold must be a positive number");
        }
        if (data.commentThreshold !== undefined && data.commentThreshold < 1) {
            throw new Error("Comment threshold must be a positive number");
        }
        if (data.shareThreshold !== undefined && data.shareThreshold < 1) {
            throw new Error("Share threshold must be a positive number");
        }

        // If enabling this threshold, disable all others first
        if (data.enabled === true) {
            await OutlierThreshold.updateMany({ _id: { $ne: thresholdId } }, { enabled: false });
            logServiceOperation('OutlierThresholdService', 'Disabled other thresholds', { thresholdId });
        }

        const threshold = await OutlierThreshold.findByIdAndUpdate(
            thresholdId,
            data,
            { new: true, runValidators: true }
        );

        if (!threshold) {
            throw new Error("Threshold not found");
        }

        logServiceOperation('OutlierThresholdService', 'Threshold updated successfully', {
            thresholdId,
            enabled: threshold.enabled
        });
        this.invalidateCache();
        return threshold;
    }

    /**
     * Enable a specific threshold version (disables all others)
     */
    async enableThreshold(thresholdId: string): Promise<any> {
        // Disable all thresholds first
        await OutlierThreshold.updateMany({}, { enabled: false });
        
        // Enable the specified threshold
        const threshold = await OutlierThreshold.findByIdAndUpdate(
            thresholdId,
            { enabled: true },
            { new: true, runValidators: true }
        );

        if (!threshold) {
            throw new Error("Threshold not found");
        }

        logServiceOperation('OutlierThresholdService', 'Threshold enabled', {
            thresholdId,
            version: threshold.version
        });
        this.invalidateCache();
        return threshold;
    }

    /**
     * Disable a specific threshold
     */
    async disableThreshold(thresholdId: string): Promise<any> {
        const threshold = await OutlierThreshold.findByIdAndUpdate(
            thresholdId,
            { enabled: false },
            { new: true, runValidators: true }
        );

        if (!threshold) {
            throw new Error("Threshold not found");
        }

        logServiceOperation('OutlierThresholdService', 'Threshold disabled', {
            thresholdId,
            version: threshold.version
        });
        this.invalidateCache();
        return threshold;
    }

    /**
     * Get all threshold versions
     */
    async getAllThresholds(): Promise<any[]> {
        return await OutlierThreshold.find({}).sort({ version: -1, createdAt: -1 });
    }
}

// Export singleton instance
export const outlierThresholdService = new OutlierThresholdService();
