import { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Shortcut {
  key: string;
  description: string;
}

interface ProductKeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
}

export function ProductKeyboardShortcutsHelp({ shortcuts }: ProductKeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">קיצורים</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            קיצורי מקלדת
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          לחץ <Badge variant="outline" className="font-mono text-xs">?</Badge> להצגת קיצורים
        </p>
      </DialogContent>
    </Dialog>
  );
}
