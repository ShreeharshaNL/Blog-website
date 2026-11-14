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
          <div className="relative flex flex-col min-h-screen bg-background text-foreground transition-colors selection:bg-primary/30 selection:text-amber-200">
            {/* Global Desert Sunset Waves Wallpaper */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <img
                src="/hero-backdrop.jpg"
                alt="INKVERSE Artwork Background"
                className="w-full h-full object-cover object-center opacity-30 dark:opacity-55 filter saturate-130 contrast-110"
              />
              <div className="absolute inset-0 bg-background/55 dark:bg-background/55 backdrop-blur-[1px]" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/80" />
            </div>

            <Navbar />
            <main className="flex-1 relative z-10">
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
