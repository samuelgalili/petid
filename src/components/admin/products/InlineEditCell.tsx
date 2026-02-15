import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InlineEditCellProps {
  value: string | number | boolean | null;
  type: "text" | "number" | "select" | "toggle";
  options?: { value: string; label: string }[];
  onSave: (newValue: any) => Promise<void>;
  displayValue?: React.ReactNode;
  className?: string;
}

export function InlineEditCell({ value, type, options, onSave, displayValue, className }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    if (editValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(type === "number" ? parseFloat(editValue) : editValue);
      setEditing(false);
    } catch {
      setEditValue(value);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (type === "toggle") {
    return (
      <button
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(!value);
          } finally {
            setSaving(false);
          }
        }}
        disabled={saving}
        className={cn("cursor-pointer transition-opacity", saving && "opacity-50", className)}
      >
        {displayValue}
      </button>
    );
  }

  if (!editing) {
    return (
      <div
        onClick={() => {
          setEditValue(value);
          setEditing(true);
        }}
        className={cn(
          "cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-muted/80 transition-colors group",
          className
        )}
        title="לחץ לעריכה"
      >
        {displayValue ?? String(value ?? "-")}
      </div>
    );
  }

  if (type === "select") {
    return (
      <Select
        value={String(editValue || "")}
        onValueChange={async (v) => {
          setEditValue(v);
          setSaving(true);
          try {
            await onSave(v);
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
        open={true}
        onOpenChange={(open) => {
          if (!open) setEditing(false);
        }}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type={type}
        value={editValue ?? ""}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="h-7 w-20 text-xs px-2"
        disabled={saving}
      />
    </div>
  );
}
