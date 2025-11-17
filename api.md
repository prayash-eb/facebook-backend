# Facebook Backend API Documentation

Base URL: `http://localhost:5000/api/v1`

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Posts](#posts)
- [Comments](#comments)
- [Reactions](#reactions)
- [Shares](#shares)
- [Follow System](#follow-system)
- [Friendship System](#friendship-system)
- [Notifications](#notifications)
- [Outlier Thresholds](#outlier-thresholds)

---

## Authentication

### Register User

**POST** `/user/register`

Create a new user account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phoneNo": "+1234567890",
  "bio": "Software Developer"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "followersCount": 0,
    "followingsCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Email must be valid format
- Password minimum 8 characters
- Full name minimum 2 characters
- Bio maximum 500 characters (optional)

---

### Login

**POST** `/user/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@example.com",
    "profilePic": "https://...",
    "followersCount": 150,
    "followingsCount": 200
  }
}
```

**Token Usage:**
All protected endpoints require the token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Change Password

**POST** `/user/change-password`

Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password Changed Successfully"
}
```

**Validation:**
- New password minimum 8 characters
- New password must differ from old password

---

### Get All Users

**GET** `/user/`

Retrieve list of all users.

**Response:** `200 OK`
```json
{
  "message": "Users fetched successfully",
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john@example.com",
      "profilePic": "https://...",
      "bio": "Software Developer",
      "followersCount": 150,
      "followingsCount": 200
    }
  ]
}
```

---

## Posts

### Create Post

**POST** `/post/create`

Create a new post or story with optional media.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  data: JSON.stringify({
    textContent: "Hello World!",
    privacy: "public",  // "public", "friends", "onlyme"
    tags: ["userId1", "userId2"],
    postType: "post"    // "post" or "story"
  }),
  media: [File, File]  // Optional: up to 10 files
}
```

**Response:** `201 Created`
```json
{
  "message": "Post created successfully",
  "post": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "fullName": "John Doe",
    "textContent": "Hello World!",
    "media": [
      {
        "mediaType": "image",
        "url": "https://cloudinary.com/..."
      }
    ],
    "privacy": "public",
    "reactionsCount": 0,
    "commentsCount": 0,
    "shareCount": 0,
    "isViral": false,
    "postType": "post",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Must have text or media
- Text maximum 5000 characters
- Up to 10 media files
- Images max 5MB each
- Videos max 50MB each

---

### Get Single Post

**GET** `/post/:postId`

Retrieve a specific post by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Post fetched successfully",
  "post": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "fullName": "John Doe",
    "userAvatar": "https://...",
    "textContent": "Hello World!",
    "media": [],
    "privacy": "public",
    "reactionsCount": 25,
    "commentsCount": 10,
    "shareCount": 5,
    "recentComments": [
      {
        "commentId": "507f1f77bcf86cd799439013",
        "userId": "507f1f77bcf86cd799439014",
        "fullName": "Jane Smith",
        "comment": "Great post!",
        "createdAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Privacy Logic:**
- `public`: Anyone can view
- `friends`: Only accepted friends can view
- `onlyme`: Only post owner can view

---

### Get User Posts

**GET** `/post/`

Get all posts by authenticated user with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example:** `/post/?page=2&limit=10`

**Response:** `200 OK`
```json
{
  "message": "Posts fetched successfully",
  "posts": [...],
  "total": 45,
  "page": 2,
  "totalPages": 5
}
```

---

### Update Post

**PATCH** `/post/update/:postId`

Update an existing post.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  data: JSON.stringify({
    textContent: "Updated content",
    privacy: "friends",
    tags: ["userId1"]
  }),
  media: [File]  // Optional: new media files
}
```

**Response:** `200 OK`
```json
{
  "message": "Post updated successfully",
  "post": { /* updated post object */ }
}
```

**Authorization:**
- Only post owner can update

---

## Comments

### Create Comment

**POST** `/comment/:postId`

Add a comment to a post.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```javascript
{
  comment: "Great post!",
  parentCommentId: "507f..." // Optional: for replies
}
// Optional file: media
```

**Response:** `201 Created`
```json
{
  "message": "Comment created successfully",
  "comment": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "postId": "507f1f77bcf86cd799439013",
    "comment": "Great post!",
    "media": "https://...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "isOutlier": false
}
```

**Validation:**
- Must have text or media
- Text maximum 2000 characters
- Media: images up to 5MB, videos up to 50MB

**Outlier Handling:**
- If post has ≥ threshold comments, stored in bucketed collection
- Recent 3 comments always displayed in post object

---

### Get Comments

**GET** `/comment/:postId`

Get all comments for a post with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Comments fetched successfully",
  "comments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439012",
        "fullName": "John Doe",
        "profilePic": "https://..."
      },
      "comment": "Great post!",
      "media": "https://...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

---

### Get Comment Replies

**GET** `/comment/:commentId/replies`

Get all replies to a specific comment.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "message": "Replies fetched successfully",
  "replies": [...],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

---

### Update Comment

**PUT** `/comment/:commentId`

Update a comment's text.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "comment": "Updated comment text"
}
```

**Response:** `200 OK`
```json
{
  "message": "Comment updated successfully",
  "comment": { /* updated comment */ },
  "isOutlier": false
}
```

**Authorization:**
- Only comment author can update

---

### Delete Comment

**DELETE** `/comment/:commentId`

Delete a comment and all its replies.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Comment deleted successfully",
  "isOutlier": false
}
```

**Authorization:**
- Comment author or post owner can delete

---

## Reactions

### Add/Update Reaction

**POST** `/reaction/:postId`

Add or update a reaction on a post.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reactionType": "like"  // "like", "love", "care", "angry", "sad"
}
```

**Response:** `201 Created` or `200 OK`
```json
{
  "message": "Reaction added successfully",
  "reaction": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "postId": "507f1f77bcf86cd799439013",
    "reactionType": "like",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "isOutlier": false
}
```

**Valid Reaction Types:**
- `like`
- `love`
- `care`
- `angry`
- `sad`

**Privacy Checks:**
- Cannot react to private posts (unless owner)
- Cannot react to friends-only posts (unless friends)

---

### Remove Reaction

**DELETE** `/reaction/:postId`

Remove your reaction from a post.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Reaction removed successfully"
}
```

---

### Get Reactions

**GET** `/reaction/:postId`

Get all reactions for a post.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `reactionType` (optional): Filter by type ("like", "love", etc.)

**Example:** `/reaction/507f.../reactions?reactionType=love&page=1&limit=20`

**Response:** `200 OK`
```json
{
  "message": "Reactions fetched successfully",
  "reactions": [
    {
      "reactionId": "507f...",
      "userId": {
        "_id": "507f...",
        "fullName": "John Doe",
        "profilePic": "https://..."
      },
      "reactionType": "love",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1500,
  "page": 1,
  "totalPages": 30
}
```

---

### Get Reactions Summary

**GET** `/reaction/:postId/summary`

Get count of each reaction type for a post.

**Response:** `200 OK`
```json
{
  "message": "Reactions summary fetched successfully",
  "summary": {
    "like": 850,
    "love": 450,
    "care": 120,
    "angry": 30,
    "sad": 50
  },
  "total": 1500
}
```

---

### Get User Reaction

**GET** `/reaction/:postId/user`

Get current user's reaction on a post.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "User reaction found",
  "reaction": {
    "reactionType": "love"
  }
}
```

**Response (if no reaction):** `404 Not Found`
```json
{
  "message": "User has not reacted to this post"
}
```

---

## Shares

### Share Post

**POST** `/share/:postId`

Share a post.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `201 Created`
```json
{
  "message": "Post shared successfully",
  "share": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "postId": "507f1f77bcf86cd799439013",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Unshare Post

**DELETE** `/share/:postId`

Remove a share.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "shareId": "507f1f77bcf86cd799439011"
}
```

**Response:** `200 OK`
```json
{
  "message": "Post unshared successfully"
}
```

---

### Get User Shares

**GET** `/share/`

Get all posts shared by authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Shares fetched successfully",
  "shares": [
    {
      "_id": "507f...",
      "userId": "507f...",
      "postId": {
        /* populated post object */
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 3
}
```

---

### Get Post Shares

**GET** `/share/:postId/shares`

Get all users who shared a specific post.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Post shares fetched successfully",
  "shares": [
    {
      "_id": "507f...",
      "userId": {
        "_id": "507f...",
        "fullName": "John Doe",
        "profilePic": "https://..."
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 125,
  "page": 1,
  "totalPages": 7
}
```

---

## Follow System

### Follow User

**POST** `/follow/:targetId`

Follow a user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `201 Created`
```json
{
  "message": "User followed successfully",
  "follow": {
    "_id": "507f1f77bcf86cd799439011",
    "followerId": "507f1f77bcf86cd799439012",
    "targetId": "507f1f77bcf86cd799439013",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Cannot follow yourself
- Cannot follow if already following

---

### Unfollow User

**DELETE** `/follow/:targetId`

Unfollow a user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "User unfollowed successfully"
}
```

---

### Get Followers

**GET** `/follow/:userId/followers`

Get list of users following a specific user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Followers fetched successfully",
  "followers": [
    {
      "_id": "507f...",
      "fullName": "John Doe",
      "profilePic": "https://...",
      "bio": "Software Developer",
      "followersCount": 150,
      "followingsCount": 200
    }
  ],
  "total": 1500,
  "page": 1,
  "totalPages": 75
}
```

---

### Get Following

**GET** `/follow/:userId/following`

Get list of users that a specific user is following.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Following fetched successfully",
  "following": [
    {
      "_id": "507f...",
      "fullName": "Jane Smith",
      "profilePic": "https://...",
      "bio": "Designer",
      "followersCount": 300,
      "followingsCount": 150
    }
  ],
  "total": 200,
  "page": 1,
  "totalPages": 10
}
```

---

### Check Follow Status

**GET** `/follow/:targetId/status`

Check if current user is following a target user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Follow status checked",
  "isFollowing": true
}
```

---

### Get Follow Stats

**GET** `/follow/:userId/stats`

Get follower and following counts for a user.

**Response:** `200 OK`
```json
{
  "message": "Follow stats fetched successfully",
  "stats": {
    "followersCount": 1500,
    "followingsCount": 200
  }
}
```

---

## Friendship System

### Send Friend Request

**POST** `/friend/send-friend-request`

Send a friend request to another user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "targetId": "507f1f77bcf86cd799439011"
}
```

**Response:** `201 Created`
```json
{
  "message": "Friend Request sent successfully",
  "friendRequest": {
    "_id": "507f...",
    "userIds": ["507f...", "507f..."],
    "status": "pending",
    "actionUser": "507f...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Cannot send request to yourself
- Cannot send if already friends or request pending

---

### Accept Friend Request

**PATCH** `/friend/accept-request`

Accept a pending friend request.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "targetId": "507f1f77bcf86cd799439011"
}
```

**Response:** `200 OK`
```json
{
  "message": "Friend Request Accepted",
  "userId": "507f...",
  "targetId": "507f..."
}
```

**Effect:**
- Updates both users' follower/following counts
- Changes friendship status to "accepted"

---

### Get Friend Requests

**GET** `/friend/requests`

Get all pending friend requests for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Friend requests fetched successfully",
  "friendRequests": [
    {
      "_id": "507f...",
      "actionUser": {
        "_id": "507f...",
        "fullName": "John Doe",
        "profilePic": "https://...",
        "bio": "Software Developer"
      },
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "totalPages": 1
}
```

---

### Get Friends

**GET** `/friend/`

Get list of accepted friends for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "message": "Friends fetched successfully",
  "friends": [
    {
      "_id": "507f...",
      "fullName": "Jane Smith",
      "profilePic": "https://...",
      "bio": "Designer",
      "followersCount": 300,
      "followingsCount": 150
    }
  ],
  "total": 250,
  "page": 1,
  "totalPages": 13
}
```

---

### Delete Friend Request

**DELETE** `/friend/request`

Cancel a sent friend request or reject a received one.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "targetId": "507f1f77bcf86cd799439011"
}
```

**Response:** `200 OK`
```json
{
  "message": "Friend request deleted"
}
```

---

### Unfriend

**DELETE** `/friend/unfriend`

Remove a friend connection.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "targetId": "507f1f77bcf86cd799439011"
}
```

**Response:** `200 OK`
```json
{
  "message": "Unfriended successfully"
}
```

**Effect:**
- Decrements both users' follower/following counts
- Deletes friendship record

---

## Notifications

### Create Notification

**POST** `/notification/`

Create a notification (typically used by system).

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "notificationType": "reaction",
  "notificationMessage": "John Doe reacted to your post"
}
```

**Valid Notification Types:**
- `system`
- `reaction`
- `post`
- `tags`
- `friend_requests`

**Response:** `201 Created`
```json
{
  "message": "Notification created successfully",
  "notification": {
    "_id": "507f...",
    "userId": "507f...",
    "notificationType": "reaction",
    "notificationMessage": "John Doe reacted to your post",
    "isRead": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Message maximum 500 characters

---

### Get User Notifications

**GET** `/notification/`

Get notifications for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `notificationType` (optional): Filter by type

**Example:** `/notification/?notificationType=reaction&page=1&limit=10`

**Response:** `200 OK`
```json
{
  "message": "Notifications fetched successfully",
  "notifications": [
    {
      "_id": "507f...",
      "userId": "507f...",
      "notificationType": "reaction",
      "notificationMessage": "John Doe reacted to your post",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 3
}
```

---

### Get Unread Count

**GET** `/notification/unread/count`

Get count of unread notifications.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Unread notifications count fetched successfully",
  "count": 12
}
```

---

### Mark as Read

**PUT** `/notification/:notificationId/read`

Mark a notification as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Notification marked as read",
  "notification": { /* updated notification */ }
}
```

---

### Delete Notification

**DELETE** `/notification/:notificationId`

Delete a specific notification.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Notification deleted successfully"
}
```

---

### Delete All Notifications

**DELETE** `/notification/`

Delete all notifications for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "All notifications deleted successfully",
  "deletedCount": 45
}
```

---

## Outlier Thresholds

Admin endpoints for managing viral post detection thresholds.

### Get Current Threshold

**GET** `/threshold/current`

Get the currently enabled threshold configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Threshold Fetched Successfully",
  "threshold": {
    "_id": "507f...",
    "reactionThreshold": 1000,
    "commentThreshold": 1000,
    "shareThreshold": 500,
    "version": 1,
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (if no threshold configured):** `404 Not Found`
```json
{
  "message": "No threshold configured. Using default values.",
  "defaults": {
    "reactionThreshold": 1000,
    "commentThreshold": 1000,
    "shareThreshold": 500
  }
}
```

---

### Get All Thresholds

**GET** `/threshold/all`

Get all threshold versions (enabled and disabled).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "All thresholds fetched successfully",
  "thresholds": [
    {
      "_id": "507f...",
      "reactionThreshold": 2000,
      "commentThreshold": 1500,
      "shareThreshold": 750,
      "version": 2,
      "enabled": true,
      "createdAt": "2024-01-16T10:30:00.000Z"
    },
    {
      "_id": "507f...",
      "reactionThreshold": 1000,
      "commentThreshold": 1000,
      "shareThreshold": 500,
      "version": 1,
      "enabled": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Create Threshold

**POST** `/threshold/`

Create a new threshold configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reactionThreshold": 2000,
  "commentThreshold": 1500,
  "shareThreshold": 750,
  "version": 2,
  "enabled": true
}
```

**Response:** `201 Created`
```json
{
  "message": "Threshold created successfully",
  "threshold": {
    "_id": "507f...",
    "reactionThreshold": 2000,
    "commentThreshold": 1500,
    "shareThreshold": 750,
    "version": 2,
    "enabled": true,
    "createdAt": "2024-01-16T10:30:00.000Z"
  }
}
```

**Validation:**
- All threshold values must be positive numbers (≥1)
- Version must be a positive integer
- Version must be unique
- If enabled=true, all other thresholds are automatically disabled

---

### Update Threshold

**PATCH** `/threshold/:thresholdId`

Update an existing threshold configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reactionThreshold": 2500,
  "commentThreshold": 2000,
  "shareThreshold": 1000,
  "enabled": false
}
```

**Response:** `200 OK`
```json
{
  "message": "Threshold Updated Successfully",
  "threshold": { /* updated threshold */ }
}
```

**Notes:**
- All fields are optional
- If enabled=true, other thresholds are disabled

---

### Enable Threshold

**PATCH** `/threshold/:thresholdId/enable`

Enable a specific threshold (disables all others).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Threshold enabled successfully",
  "threshold": { /* updated threshold */ }
}
```

---

### Disable Threshold

**PATCH** `/threshold/:thresholdId/disable`

Disable a specific threshold.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Threshold disabled successfully",
  "threshold": { /* updated threshold */ }
}
```

---

### Delete Threshold

**DELETE** `/threshold/:thresholdId`

Delete a threshold configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Threshold deleted successfully",
  "threshold": { /* deleted threshold */ }
}
```

---

## Error Responses

All endpoints may return these common error responses:

### 400 Bad Request
```json
{
  "message": "Validation error description"
}
```

### 401 Unauthorized
```json
{
  "message": "Authorization header missing or malformed"
}
```

### 403 Forbidden
```json
{
  "message": "Not authorized to perform this action"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "message": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "errorName": "ErrorType"  // Only in development
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. For production use, consider implementing rate limiting middleware.

---

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Use pagination** for list endpoints to avoid large payloads
3. **Handle errors gracefully** on the client side
4. **Validate file sizes** before upload on client side
5. **Cache threshold values** on client to reduce API calls
6. **Use appropriate image/video compression** before upload
7. **Implement retry logic** for failed requests
8. **Store JWT token securely** (not in localStorage for sensitive apps)

---

## Example: Complete User Flow

### 1. Register and Login
```javascript
// Register
POST /api/v1/user/register
Body: { fullName, email, password }

// Login
POST /api/v1/user/login
Body: { email, password }
Response: { token, user }
```

### 2. Create a Post with Image
```javascript
// Create FormData
const formData = new FormData();
formData.append('data', JSON.stringify({
  textContent: "My first post!",
  privacy: "public",
  postType: "post"
}));
formData.append('media', imageFile);

// Upload
POST /api/v1/post/create
Headers: { Authorization: "Bearer <token>" }
Body: formData
```

### 3. Get Feed and React
```javascript
// Get posts
GET /api/v1/post/?page=1&limit=20
Headers: { Authorization: "Bearer <token>" }

// React to a post
POST /api/v1/reaction/:postId
Headers: { Authorization: "Bearer <token>" }
Body: { reactionType: "love" }
```

### 4. Comment and Follow
```javascript
// Add comment
POST /api/v1/comment/:postId
Headers: { Authorization: "Bearer <token>" }
Body: { comment: "Great post!" }

// Follow user
POST /api/v1/follow/:targetId
Headers: { Authorization: "Bearer <token>" }
```

---

## Support

For issues or questions:
- Check error messages in response
- Review validation requirements
- Check authentication token
- Verify request body format
- Review file size limits

Happy coding! 🚀