import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import WebsiteLayout from "./components/WebsiteLayout";
import { AppLoader } from "./components/AppLoader";
import { ThemeProvider } from "@/lib/theme";
import { CurrentUserProvider } from "./lib/currentUserContext.tsx";

const HomePage = lazy(() => import("./pages/HomePage"));
const CardsPage = lazy(() => import("./pages/CardsPage"));
const WalletPage = lazy(() => import("./pages/WalletApiPage"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const SendIntentPage = lazy(() => import("./pages/SendIntentPage"));
const CardDetailsPage = lazy(() => import("./pages/CardDetailsApiPage"));
const ProofUploadPage = lazy(() => import("./pages/ProofUploadPage"));
const ProfilePage = lazy(() => import("./pages/ProfileApiPage"));
const SearchAccountPage = lazy(() => import("./pages/SearchAccountPage"));
const MoneyCoachPage = lazy(() => import("./pages/MoneyCoachPage"));
const CoachChatPage = lazy(() => import("./pages/CoachChatPage"));
const SentCardsPage = lazy(() => import("./pages/SentCardsPage"));
const FeatureCatalogPage = lazy(() => import("./pages/FeatureCatalogPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const WebsiteHomePage = lazy(() => import("./pages/WebsiteHomePage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const DeveloperIntegrationsPage = lazy(
  () => import("./pages/DeveloperIntegrationsPage"),
);
const AmazonCheckoutPage = lazy(() => import("./pages/AmazonCheckoutPage"));
const RentCheckoutPage = lazy(() => import("./pages/RentCheckoutPage"));
const TryIntPayCardsPage = lazy(() => import("./pages/TryIntPayCardsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RequireUser = lazy(() => import("./components/RequireUser"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.key]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner closeButton />
        <BrowserRouter>
          <CurrentUserProvider>
            <ScrollToTop />
            <Suspense
              fallback={<AppLoader size="fullscreen" label="Loading" />}
            >
              <Routes>
                <Route element={<WebsiteLayout />}>
                  <Route path="/" element={<WebsiteHomePage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route
                    path="/docs/developer-integrations"
                    element={<DeveloperIntegrationsPage />}
                  />
                </Route>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AppLayout />}>
                  <Route element={<RequireUser />}>
                    <Route path="/app" element={<HomePage />} />
                    <Route path="/app/user/:userId" element={<HomePage />} />
                    <Route path="/cards" element={<CardsPage />} />
                    <Route path="/cards/sent" element={<SentCardsPage />} />
                    <Route path="/cards/:cardId" element={<CardDetailsPage />} />
                    <Route path="/wallet" element={<WalletPage />} />
                    <Route path="/intent/new" element={<SendIntentPage />} />
                    <Route path="/proof/:cardId" element={<ProofUploadPage />} />
                    <Route
                      path="/proof/:cardId/:proofId"
                      element={<ProofUploadPage />}
                    />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/search" element={<SearchAccountPage />} />
                    <Route path="/coach" element={<MoneyCoachPage />} />
                    <Route path="/coach/chat" element={<CoachChatPage />} />
                    <Route path="/features" element={<FeatureCatalogPage />} />
                    <Route path="/users" element={<UsersPage />} />
                  </Route>
                </Route>
                <Route path="/amazon" element={<AmazonCheckoutPage />} />
                <Route path="/rent" element={<RentCheckoutPage />} />
                <Route path="/try-intPay-cards" element={<TryIntPayCardsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </CurrentUserProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
