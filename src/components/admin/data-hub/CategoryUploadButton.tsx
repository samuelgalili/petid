import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataSourceType } from "@/types/admin-data";
import { CategoryUploadDialog } from "./CategoryUploadDialog";

interface CategoryUploadButtonProps {
  category: DataSourceType;
  categoryLabel: string;
  categoryIcon: string;
  onSuccess: () => void;
}

export const CategoryUploadButton = ({
  category,
  categoryLabel,
  categoryIcon,
  onSuccess,
}: CategoryUploadButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-7"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-3 h-3" />
        הוסף
      </Button>
      <CategoryUploadDialog
        open={open}
        onOpenChange={setOpen}
        category={category}
        categoryLabel={categoryLabel}
        categoryIcon={categoryIcon}
        onSuccess={() => {
          onSuccess();
          setOpen(false);
        }}
      />
    </>
  );
};
