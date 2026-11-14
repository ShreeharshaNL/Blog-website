import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';

// Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { BlogDetailPage } from './pages/BlogDetailPage';
import { WritePage } from './pages/WritePage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { PointsHistoryPage } from './pages/PointsHistoryPage';
import { AdminPage } from './pages/AdminPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors selection:bg-primary/20 selection:text-primary">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:slug" element={<CategoryDetailPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/blog/:slug" element={<BlogDetailPage />} />
                <Route path="/write" element={<WritePage />} />
                <Route path="/write/:id" element={<WritePage />} />
                <Route path="/@:username" element={<ProfilePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/points" element={<PointsHistoryPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
