# Caishen - Personal Finance Management

![Caishen Logo](public/logo.png)

Caishen is a modern, intuitive personal finance management application that helps users track expenses, manage budgets, and gain insights into their financial health.

## 🌟 Features

- **Expense Tracking**: Easily log and categorize your daily expenses
- **Financial Overview**: Get a clear picture of your financial status with intuitive dashboards
- **Budget Management**: Set and monitor your spending limits
- **Calendar View**: Visualize your expenses and upcoming bills in a calendar format
- **Smart Filters**: Advanced filtering options to analyze your spending patterns
- **User Authentication**: Secure login and user management
- **Responsive Design**: Seamless experience across all devices

## 🚀 Tech Stack

- **Frontend**: Next.js 14 with App Router
- **UI Framework**: Tailwind CSS
- **Components**: shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **State Management**: React Hooks
- **Styling**: Tailwind CSS with custom color system

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/caishen.git
   cd caishen
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                 # App router pages
├── components/          # Reusable components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## 🎨 Design System

Caishen uses a custom color system defined in `src/lib/colors.ts`:

- **Primary**: #061B78 (Deep Blue)
- **Base Colors**:
  - 100: White
  - 200: Light Gray
  - 300: Border Gray
- **Content Colors**:
  - Primary: Dark Text
  - Secondary: Muted Text

## 🔒 Authentication

The application uses Firebase Authentication for user management. Features include:

- Email/Password authentication
- Secure session management
- Protected routes
- User profile management

## 📱 Responsive Design

Caishen is built with a mobile-first approach and is fully responsive across all devices:

- Desktop: Full feature set with expanded layout
- Tablet: Optimized layout with essential features
- Mobile: Streamlined interface for on-the-go use

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- Pedro Felippe - Lead Developer

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Lucide Icons](https://lucide.dev/) for the icon set
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
