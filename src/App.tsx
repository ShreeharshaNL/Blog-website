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
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="relative flex flex-col min-h-screen bg-background text-foreground transition-colors selection:bg-primary/20 selection:text-primary">
            {/* Global Desert Sunset Waves Background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <img
                src="/hero-backdrop.jpg"
                alt="INKVERSE Wallpaper Background"
                className="w-full h-full object-cover object-right-top md:object-center opacity-40 dark:opacity-65 filter saturate-110"
              />
              {/* Directional vignettes ensuring 100% text readability on feed */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/50 to-background/20 dark:from-background/80 dark:via-background/45 dark:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />
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
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/u/:username" element={<ProfilePage />} />
                <Route path="/author/:username" element={<ProfilePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/points" element={<PointsHistoryPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/login" element={<LoginPage />} />
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
