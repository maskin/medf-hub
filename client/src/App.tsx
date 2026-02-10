import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LoginPage from "./pages/LoginPage";
import Home from "./pages/Home";
import DocumentList from "./pages/DocumentList";
import DocumentView from "./pages/DocumentView";
import DocumentCreate from "./pages/DocumentCreate";
import DocumentEdit from "./pages/DocumentEdit";
import MarkdownConverter from "./pages/MarkdownConverter";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <AppLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/documents" component={DocumentList} />
          <Route path="/documents/create" component={DocumentCreate} />
          <Route path="/documents/:id" component={DocumentView} />
          <Route path="/documents/:id/edit" component={DocumentEdit} />
          <Route path="/convert" component={MarkdownConverter} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
