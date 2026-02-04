import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useDocumentExtraction = () => {
  const { toast } = useToast();

  const extractDataFromDocument = async (
    documentId: string,
    documentContent: string,
    documentName: string,
    petId: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-pet-document', {
        body: {
          documentId,
          documentContent,
          documentName,
          petId,
        },
      });

      if (error) {
        console.error('Extraction error:', error);
        toast({
          title: 'שגיאה בעיבוד המסמך',
          description: 'לא הצלחנו לחלץ נתונים מהמסמך. אתה יכול לעדכן זאת ידנית.',
          variant: 'destructive',
        });
        return null;
      }

      if (data.success) {
        toast({
          title: 'מסמך נעיבד בהצלחה',
          description: 'הנתונים הרלוונטיים נשמרו במערכת.',
        });
        return data.extracted_data;
      }

      return null;
    } catch (error) {
      console.error('Document extraction error:', error);
      return null;
    }
  };

  return { extractDataFromDocument };
};
