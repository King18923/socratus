import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LibraryPage from "@/pages/library";
import FavoritesPage from "@/pages/favorites";
import RecentPage from "@/pages/recent";
import ReaderPage from "@/pages/reader";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LibraryPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/recent" component={RecentPage} />
      <Route path="/read/:bookId" component={ReaderPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
