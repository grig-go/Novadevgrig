-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ai_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own settings" 
    ON public.user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
    ON public.user_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
    ON public.user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" 
    ON public.user_settings FOR DELETE 
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Add comment
COMMENT ON TABLE public.user_settings IS 'Stores user preferences including AI image generation settings';
COMMENT ON COLUMN public.user_settings.ai_settings IS 'AI image generation configuration (Gemini, Imagen, storage settings)';