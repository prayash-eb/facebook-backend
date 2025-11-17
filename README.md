# Facebook Backend API

A robust social media backend built with Node.js, Express, TypeScript, and MongoDB. This system includes advanced features like viral post detection, bucketing for high-engagement content, and comprehensive social networking capabilities.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication
- **Posts & Stories**: Create, edit, and manage posts with media support
- **Social Interactions**: Reactions, comments, shares, follows, and friendships
- **Viral Content Management**: Automatic detection and optimized storage for high-engagement posts
- **Privacy Controls**: Public, friends-only, and private post visibility
- **Real-time Notifications**: System notifications for user activities
- **Media Upload**: Image and video support via Cloudinary
- **Configurable Thresholds**: Admin-controlled viral post detection thresholds
- **Comprehensive Logging**: Winston-based logging with daily rotation

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Cloudinary account for media storage
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd facebook-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
BASE_URL=http://localhost
NODE_ENV=development

# Database
DATABASE_URL_REMOTE=mongodb://localhost:27017/facebook

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Enable file logging in development
ENABLE_FILE_LOGGING=false
```

4. **Start the server**

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app.ts                  # Express app configuration
├── server.ts              # Server entry point
├── configs/
│   └── database.ts        # MongoDB connection
├── controllers/           # Request handlers
│   ├── auth.controller.ts
│   ├── post.controller.ts
│   ├── comment.controller.ts
│   ├── reaction.controller.ts
│   ├── share.controller.ts
│   ├── follow.controller.ts
│   ├── friendship.controller.ts
│   ├── notification.controller.ts
│   └── outlier-threshold.controller.ts
├── middleware/            # Express middleware
│   ├── auth.middleware.ts
│   ├── upload.middleware.ts
│   ├── errorHandler.ts
│   └── httpLogger.middleware.ts
├── models/               # Mongoose schemas
│   ├── user.model.ts
│   ├── post.model.ts
│   ├── comment.model.ts
│   ├── reaction.model.ts
│   ├── share.model.ts
│   ├── follow.model.ts
│   ├── friendship.model.ts
│   ├── notification.model.ts
│   ├── outlier_comment.model.ts
│   ├── outlier_reaction.model.ts
│   └── outlier_threshold.model.ts
├── routes/              # API route definitions
├── services/            # Business logic
│   └── outlier-threshold.service.ts
├── utils/              # Utility functions
│   ├── logger.ts
│   ├── validation.ts
│   └── convert.ts
└── libs/               # Third-party integrations
    └── cloudinary.ts
```

## 🔑 Key Concepts

### Viral Post Management

The system automatically detects and optimizes storage for high-engagement posts:

- **Normal Posts**: Stored in regular collections for fast queries
- **Viral Posts**: Once engagement thresholds are exceeded, data is moved to bucketed collections
- **Buckets**: Groups of 100 reactions/comments per bucket for efficient storage
- **Thresholds**: Configurable via API (default: 1000 reactions, 1000 comments, 500 shares)

### Privacy Levels

- **public**: Visible to everyone
- **friends**: Only visible to accepted friends
- **onlyme**: Only visible to post owner

### Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 📊 API Documentation

For detailed API documentation, please refer to [api.md](api.md).

Quick links to API sections:
- [Authentication](api.md#authentication) - Register, login, password management
- [Posts](api.md#posts) - Create, read, update posts with media
- [Comments](api.md#comments) - Comment on posts and reply to comments
- [Reactions](api.md#reactions) - Like, love, care, angry, sad reactions
- [Shares](api.md#shares) - Share posts with your network
- [Follow System](api.md#follow-system) - Follow/unfollow users
- [Friendship System](api.md#friendship-system) - Send and manage friend requests
- [Notifications](api.md#notifications) - User notifications
- [Outlier Thresholds](api.md#outlier-thresholds) - Configure viral post thresholds

## 🚦 Getting Started (Quick Guide)

### 1. Register a User
```bash
POST http://localhost:5000/api/v1/user/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### 2. Login
```bash
POST http://localhost:5000/api/v1/user/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

You'll receive a JWT token in the response. Use this token in all subsequent requests.

### 3. Create a Post
```bash
POST http://localhost:5000/api/v1/post/create
Authorization: Bearer <your-token>
Content-Type: multipart/form-data

data: {
  "textContent": "Hello World!",
  "privacy": "public",
  "postType": "post"
}
media: [files]
```

## 🧪 Testing

The API can be tested using tools like:
- **Postman** - Import the API examples from api.md
- **Insomnia** - REST client with GraphQL support
- **cURL** - Command-line testing
- **Thunder Client** - VS Code extension

Example cURL request:
```bash
curl -X POST http://localhost:5000/api/v1/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"securePassword123"}'
```

## 📝 Logging

Logs are stored in the `logs/` directory with daily rotation:

- `error-YYYY-MM-DD.log`: Error-level logs only
- `combined-YYYY-MM-DD.log`: All log levels
- `http-YYYY-MM-DD.log`: HTTP request logs

**Log Retention:**
- Error and combined logs: 30 days
- HTTP logs: 14 days

**Log Levels:**
- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages
- `http`: HTTP request/response logs
- `debug`: Debug information (development only)

## 🔒 Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Request validation and sanitization
- **File Upload Security**: Size and type restrictions
- **Privacy Controls**: Post-level access control
- **MongoDB Injection Prevention**: Mongoose schema validation
- **CORS**: Configurable cross-origin resource sharing

## 🎯 Media Upload Guidelines

### Images
- **Formats**: JPEG, PNG, GIF, WebP
- **Max Size**: 5MB per image
- **Max Count**: 10 images per post

### Videos
- **Formats**: MP4, MOV, AVI
- **Max Size**: 50MB per video
- **Max Count**: 10 videos per post

### Comments
- **Images**: Up to 5MB
- **Videos**: Up to 50MB
- Single media file per comment

## 🗄️ Database Schema Overview

### Core Collections
- **users**: User profiles and authentication
- **posts**: Regular posts and stories
- **comments**: Post comments (normal engagement)
- **reactions**: Post reactions (normal engagement)
- **shares**: Post shares
- **follows**: User follow relationships
- **friendships**: Friend connections
- **notifications**: User notifications
- **outlier_thresholds**: Viral post threshold configurations

### Outlier Collections (Viral Posts)
- **outlier_comments**: Bucketed comments for viral posts
- **outlier_reactions**: Bucketed reactions for viral posts

## 🔄 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `BASE_URL` | Base URL for the server | No | http://localhost |
| `NODE_ENV` | Environment mode | No | development |
| `DATABASE_URL_REMOTE` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT | Yes | - |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes | - |
| `ENABLE_FILE_LOGGING` | Enable file-based logging | No | false |

## 🛣️ API Routes

Base URL: `http://localhost:5000/api/v1`

| Route | Description |
|-------|-------------|
| `/user/*` | User authentication and management |
| `/post/*` | Post creation and management |
| `/comment/*` | Comment operations |
| `/reaction/*` | Reaction operations |
| `/share/*` | Share operations |
| `/follow/*` | Follow/unfollow operations |
| `/friend/*` | Friendship management |
| `/notification/*` | Notification management |
| `/threshold/*` | Viral post threshold configuration |

## 🏗️ Architecture Highlights

### Viral Content Optimization
When a post exceeds configured thresholds:
1. Reactions/comments are moved to bucketed collections
2. Each bucket contains up to 100 items
3. Post maintains counters and references to buckets
4. Recent 3 comments always displayed in post object
5. Pagination queries optimized for bucketed data

### Privacy-Based Access Control
- Public posts: Accessible to all users
- Friends-only posts: Accessible only to accepted friends
- Private posts: Accessible only to post owner
- Middleware validates access on all read operations

### Efficient Media Handling
- Cloudinary integration for CDN delivery
- Automatic format optimization
- Responsive image transformations
- Secure upload with signed URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Use TypeScript strict mode
- Follow existing code formatting
- Add JSDoc comments for functions
- Write meaningful commit messages
- Update documentation for API changes

## 📦 Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Compile TypeScript to JavaScript
npm start          # Start production server
npm run lint       # Run ESLint (if configured)
npm test           # Run tests (if configured)
```

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MongoDB is running
- Check `DATABASE_URL_REMOTE` in `.env`
- Ensure network connectivity to MongoDB server

### Authentication Errors
- Verify JWT token is included in Authorization header
- Check token format: `Bearer <token>`
- Ensure token hasn't expired

### Upload Failures
- Verify Cloudinary credentials in `.env`
- Check file size limits
- Ensure supported file formats

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

## 📈 Performance Considerations

- **Indexing**: Key fields indexed for fast queries
- **Pagination**: All list endpoints support pagination
- **Bucketing**: Viral content stored efficiently
- **CDN**: Media served via Cloudinary CDN
- **Connection Pooling**: MongoDB connection pool configured
- **Logging**: Asynchronous logging for minimal performance impact

## 🔮 Future Enhancements

- [ ] Real-time messaging with WebSockets
- [ ] GraphQL API support
- [ ] Redis caching for frequently accessed data
- [ ] Rate limiting middleware
- [ ] Advanced search with Elasticsearch
- [ ] Video streaming capabilities
- [ ] Push notifications
- [ ] Story expiration after 24 hours
- [ ] Automated content moderation
- [ ] Analytics and insights dashboard

## 📄 License

ISC

## 👥 Support

For issues and questions:
- Open an issue in the repository
- Check existing documentation in `api.md`
- Review error messages and logs
- Contact the development team

---

**Built with ❤️ using Node.js, Express, TypeScript, and MongoDB**
