import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PointsContextType {
  totalPoints: number;
  addPoints: (points: number) => Promise<void>;
  deductPoints: (points: number) => Promise<void>;
  loading: boolean;
}

const PointsContext = createContext<PointsContextType | undefined>(undefined);

export const PointsProvider = ({ children }: { children: ReactNode }) => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setTotalPoints(data?.points || 0);
    } catch (error: any) {
      console.error("Error fetching points:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPoints = async (points: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const newTotal = totalPoints + points;

      const { error } = await supabase
        .from('profiles')
        .update({ points: newTotal })
        .eq('id', user.id);

      if (error) throw error;

      setTotalPoints(newTotal);
    } catch (error: any) {
      console.error("Error adding points:", error);
      toast({
        title: "Error updating points",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deductPoints = async (points: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (totalPoints < points) {
        throw new Error("Insufficient points");
      }

      const newTotal = totalPoints - points;

      const { error } = await supabase
        .from('profiles')
        .update({ points: newTotal })
        .eq('id', user.id);

      if (error) throw error;

      setTotalPoints(newTotal);
    } catch (error: any) {
      console.error("Error deducting points:", error);
      toast({
        title: "Error updating points",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <PointsContext.Provider value={{ totalPoints, addPoints, deductPoints, loading }}>
      {children}
    </PointsContext.Provider>
  );
};

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error("usePoints must be used within a PointsProvider");
  }
  return context;
};