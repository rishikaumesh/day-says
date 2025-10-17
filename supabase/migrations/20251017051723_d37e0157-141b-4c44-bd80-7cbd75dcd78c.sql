-- Create table for personal mood signatures
CREATE TABLE public.mood_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phrase TEXT NOT NULL,
  associated_mood TEXT NOT NULL,
  confidence_score INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, phrase)
);

-- Enable RLS
ALTER TABLE public.mood_signatures ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own mood signatures" 
ON public.mood_signatures 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood signatures" 
ON public.mood_signatures 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood signatures" 
ON public.mood_signatures 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_mood_signatures_user_id ON public.mood_signatures(user_id);
CREATE INDEX idx_mood_signatures_confidence ON public.mood_signatures(user_id, confidence_score DESC);