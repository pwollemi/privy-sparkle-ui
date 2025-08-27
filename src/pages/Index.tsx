import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Create & Trade Meme Tokens
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Launch your own tokens, build communities, and trade on the fastest growing platform for meme coins.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Link to="/create">
                <Plus className="w-5 h-5 mr-2" />
                Create Token
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg">
              <Link to="/home">
                <TrendingUp className="w-5 h-5 mr-2" />
                Explore Tokens
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link to="/auth">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
