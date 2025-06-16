# 🎓 Examination Management System (SEMS)

A comprehensive full-stack MERN application for managing examination processes including teacher/student management, date sheet creation, room allocation, and answer sheet dispatch tracking.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB Atlas account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/examination-management-system.git
   cd examination-management-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp server/.env.example server/.env
   
   # Update the .env files with your MongoDB Atlas connection string and other configurations
   ```

4. **Seed sample data**
   ```bash
   npm run seed
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

### Default Login Credentials

After seeding, you can login with:
- **Admin**: admin@sems.com / admin123
- **Data Entry Operator**: operator@sems.com / operator123

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Redux Toolkit
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Authentication**: JWT with refresh tokens
- **File Upload**: Multer for PDF/document handling
- **State Management**: Redux Toolkit with persistence
- **Notifications**: React Hot Toast

### Project Structure
```
SEMS/
├── client/          # React frontend application
├── server/          # Express.js backend API
├── package.json     # Root package with concurrently scripts
└── ARCHITECTURE.md  # Detailed architectural documentation
```

## 📱 Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Data Entry Operator)
- Protected routes on both frontend and backend
- Automatic token refresh

### 👥 User Management
- **Teachers**: Add, edit, delete teacher records with subject assignments
- **Students**: Manage student records with class and section information
- **Subjects**: Configure subjects with codes, duration, and marks

### 📅 Examination Management
- **Date Sheets**: Create and manage examination schedules for 10th/12th classes
- **Room Allocation**: Assign rooms, supervisors, and students for examinations
- **Answer Sheet Dispatch**: Track answer sheet collection and dispatch

### 🎛️ Dashboard Features
- Real-time statistics and analytics
- Quick action buttons for common tasks
- Recent activity tracking
- Examination progress monitoring

### 🎨 UI/UX Features
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Smooth loading indicators
- **Toast Notifications**: Success/error feedback
- **Modal Dialogs**: Clean popup interfaces
- **Data Tables**: Sortable, filterable, and paginated tables

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start both frontend and backend
npm run client       # Start only frontend
npm run server       # Start only backend

# Database
npm run seed         # Seed comprehensive sample data

# Building
npm run build        # Build frontend for production
npm start           # Start production server

# Testing & Quality
npm run test        # Run tests for both frontend and backend
npm run lint        # Run linting for both projects
npm run clean       # Clean all node_modules and build files
```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

#### Teachers
- `GET /api/teachers` - Get all teachers
- `POST /api/teachers` - Create new teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

#### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

#### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create new subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

#### Date Sheets
- `GET /api/datesheets` - Get all date sheets
- `POST /api/datesheets` - Create new date sheet
- `PUT /api/datesheets/:id` - Update date sheet
- `DELETE /api/datesheets/:id` - Delete date sheet

#### Room Management
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create new room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room
- `POST /api/rooms/allocate` - Allocate rooms for examination

#### Dispatch Management
- `GET /api/dispatch` - Get dispatch records
- `POST /api/dispatch` - Create dispatch record
- `PUT /api/dispatch/:id` - Update dispatch status

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required environment variables:

- **Database**: MongoDB Atlas connection string
- **JWT**: Secret keys and expiration times
- **Server**: Port and API configuration
- **File Upload**: Size limits and upload paths
- **Email**: SMTP configuration for notifications

### Database Schema

The application uses MongoDB with Mongoose ODM. Key collections:

- **users**: Authentication and user roles
- **teachers**: Teacher information and subject assignments
- **students**: Student records with class information
- **subjects**: Subject definitions and configurations
- **datesheets**: Examination schedules and dates
- **rooms**: Room information and facilities
- **allocations**: Room-examination mappings
- **dispatches**: Answer sheet tracking

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   NODE_ENV=production
   # Update other variables as needed
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Deployment Platforms

The application can be deployed on:
- **Heroku**: Use the included Procfile
- **Vercel**: Deploy frontend separately
- **DigitalOcean**: Full-stack deployment
- **AWS**: EC2 or Elastic Beanstalk

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@sems.dev
- Documentation: See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation

## 🙏 Acknowledgments

- CBSE for examination format standards
- MongoDB Atlas for database hosting
- React and Node.js communities for excellent documentation
- Tailwind CSS for utility-first styling approach