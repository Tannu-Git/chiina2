# 🚀 Logistics OMS - Order Management System

A modern, beautiful logistics order management system built with React, Express, and MongoDB. Features Excel-like order grids, real-time container tracking, financial analytics, and role-based security.

## ✨ Features

### 🎯 Core Functionality
- **Excel-like Order Grid** - Intuitive spreadsheet interface for order creation
- **Real-time Container Tracking** - Track shipments with beautiful UI
- **Financial Dashboard** - Profit calculations and charge allocation
- **Warehouse Management** - QC inspections and loop-back automation
- **Role-based Security** - Admin, Staff, and Client access levels

### 🎨 Beautiful UI
- **shadcn/ui Components** - Modern, accessible design system
- **Glass-morphism Effects** - Stunning visual effects
- **Responsive Design** - Mobile-first approach
- **Dark/Light Mode** - Theme switching support
- **Smooth Animations** - Framer Motion powered

### 🔧 Technical Features
- **React 18** with Vite for fast development
- **Express.js** REST API with MongoDB
- **JWT Authentication** with role-based permissions
- **Real-time Updates** with optimistic UI
- **Excel-like Calculations** for carrying charges
- **Container ID Masking** for client security

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Lightning fast build tool
- **shadcn/ui** - Beautiful component library
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Zustand** - Lightweight state management
- **TanStack Table** - Powerful data tables
- **React Hook Form** - Form handling
- **Recharts** - Beautiful charts

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd logistics-oms
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Set up environment variables**
```bash
# Copy server environment file
cp server/.env.example server/.env

# Edit server/.env with your configuration:
# - MongoDB connection string
# - JWT secret
# - Other API keys
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running on your system
mongod
```

5. **Start the development servers**
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

### 🎯 Demo Credentials

```
Admin:  admin@demo.com  / password
Staff:  staff@demo.com  / password  
Client: client@demo.com / password
```

## 📁 Project Structure

```
logistics-oms/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   └── layout/    # Layout components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   ├── lib/           # Utilities
│   │   └── App.jsx        # Main app component
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── package.json
│   └── index.js           # Server entry point
├── package.json           # Root package.json
└── README.md
```

## 🔐 Security Features

- **JWT Authentication** with 30-minute expiration
- **Role-based Access Control** (Admin/Staff/Client)
- **Data Isolation** - Clients see only their data
- **Financial Data Masking** for non-admin users
- **Container ID Anonymization** for clients
- **Rate Limiting** and security headers
- **Input Validation** and sanitization

## 📊 Business Logic

### Order Management
- Excel-like grid interface for order creation
- Real-time price calculations
- Supplier integration and payment handling
- Carrying charge calculations (carton/CBM/weight basis)

### Warehouse Operations
- QC inspection workflows
- Automatic loop-back order creation
- Container allocation optimization
- Shortage and damage handling

### Financial Tracking
- Profit margin calculations
- Charge allocation between clients
- Currency conversion handling
- Revenue and cost reporting

## 🎨 UI Components

The system uses shadcn/ui for beautiful, accessible components:

- **Cards** - Glass-morphism effects
- **Tables** - Excel-like data grids
- **Forms** - Elegant form controls
- **Charts** - Financial visualizations
- **Modals** - Smooth dialog interactions
- **Navigation** - Responsive sidebar

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start both frontend and backend
npm run client       # Start only frontend
npm run server       # Start only backend

# Production
npm run build        # Build frontend for production
npm start           # Start production server

# Installation
npm run install-all  # Install all dependencies
```

### Environment Variables

**Server (.env)**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/logistics-oms
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d
NODE_ENV=development
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker (Optional)
```bash
# Build and run with Docker
docker-compose up --build
```

## 📈 Features Roadmap

- [ ] **Advanced Excel Grid** - Complete spreadsheet functionality
- [ ] **Real-time Notifications** - WebSocket integration
- [ ] **Advanced Analytics** - ML-powered insights
- [ ] **Mobile App** - React Native companion
- [ ] **API Documentation** - Swagger/OpenAPI
- [ ] **Multi-language Support** - i18n integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the demo credentials above

---

**Built with ❤️ using React, Express, and MongoDB**
