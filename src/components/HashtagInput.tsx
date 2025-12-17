import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HashtagInputProps {
  value: string[];
  onChange: (hashtags: string[]) => void;
  maxTags?: number;
  className?: string;
}

const HashtagInput: React.FC<HashtagInputProps> = ({
  value,
  onChange,
  maxTags = 30,
  className
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; post_count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch hashtag suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.length < 1) {
        setSuggestions([]);
        return;
      }

      const searchTerm = inputValue.replace(/^#/, '');
      const { data } = await supabase
        .from('hashtags')
        .select('id, name, post_count')
        .ilike('name', `${searchTerm}%`)
        .order('post_count', { ascending: false })
        .limit(5);

      setSuggestions(data || []);
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [inputValue]);

  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').toLowerCase().trim();
    if (!cleanTag || value.includes(cleanTag) || value.length >= maxTags) return;
    
    onChange([...value, cleanTag]);
    setInputValue('');
    setSuggestions([]);
  };

  const removeHashtag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeHashtag(value[value.length - 1]);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-background min-h-[42px]">
        {value.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <Hash className="w-3 h-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeHashtag(tag)}
              className="hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={value.length === 0 ? 'הוסף תגיות #...' : ''}
          className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg">
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => addHashtag(suggestion.name)}
              className="w-full px-3 py-2 text-right hover:bg-muted flex items-center justify-between"
            >
              <span className="flex items-center gap-1">
                <Hash className="w-4 h-4 text-muted-foreground" />
                {suggestion.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {suggestion.post_count} פוסטים
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1">
        {value.length}/{maxTags} תגיות
      </p>
    </div>
  );
};

export default HashtagInput;
