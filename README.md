# AeroJob - OJT/Internship Management System

A comprehensive platform for Philippine State College of Aeronautics students and alumni to find OJT, internship, and job opportunities in the aerospace industry.

## Features

### Backend Features
- ✅ User authentication with email OTP verification
- ✅ Role-based access control (Admin, Student, Alumni)
- ✅ User management with profile system
- ✅ Company management with approval system
- ✅ Job posting and management
- ✅ Email notifications
- ✅ RESTful API with proper validation

### Frontend Features
- ✅ Modern React.js interface with Tailwind CSS
- ✅ Responsive design for mobile and desktop
- ✅ User authentication flows (Login, Register, OTP)
- ✅ Dashboard with user/admin views
- ✅ Job search with filtering and pagination
- ✅ Profile management with photo upload
- ✅ Protected routes and navigation

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT authentication
- Nodemailer for email services
- bcrypt for password hashing
- Express Validator for input validation

### Frontend
- React.js with React Router
- Tailwind CSS for styling
- React Hook Form for forms
- Axios for API calls
- React Hot Toast for notifications
- Lucide React for icons

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/aerojob
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   npm start
   ```

## Demo Accounts

Use these accounts to test different user roles:

### Admin Account
- **Email**: admin@aerojob.ph
- **Password**: password123
- **Access**: Full administrative privileges

### Student Account
- **Email**: student@aerojob.ph
- **Password**: password123
- **Access**: Job search, profile management

### Alumni Account
- **Email**: alumni@aerojob.ph
- **Password**: password123
- **Access**: Job search, profile management

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/resend-otp` - Resend OTP

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/statistics` - Get user statistics (admin)

### Companies
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company (admin)
- `PUT /api/companies/:id` - Update company (admin)
- `GET /api/companies/search` - Search companies

### Jobs
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create job (admin)
- `PUT /api/jobs/:id` - Update job (admin)
- `GET /api/jobs/search` - Search jobs
- `GET /api/jobs/featured` - Get featured jobs

## Project Structure

```
AeroJob/
├── backend/
│   ├── config/          # Database and email configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── server.js        # Main server file
│   └── package.json
├── frontend/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── pages/       # Page components
│   │   ├── styles/      # CSS files
│   │   ├── utils/       # Utility functions
│   │   ├── App.js       # Main App component
│   │   └── index.js     # Entry point
│   └── package.json
└── README.md
```

## Development Notes

- The application uses JWT tokens for authentication
- Email OTP verification is required for new registrations
- Admin users can approve companies and job postings
- Responsive design works on mobile, tablet, and desktop
- Error handling and loading states are implemented throughout

## Next Steps

1. Add real-time notifications
2. Implement file upload for resumes
3. Add advanced search filters
4. Implement job application tracking
5. Add analytics and reporting
6. Deploy to production environment

## License

This project is for educational purposes as part of the Philippine State College of Aeronautics curriculum.
