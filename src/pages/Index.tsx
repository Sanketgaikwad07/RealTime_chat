import { useAuth } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import ChatLayout from "@/components/chat/ChatLayout";
import Login from "./Login";

const Index = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
};

export default Index;
