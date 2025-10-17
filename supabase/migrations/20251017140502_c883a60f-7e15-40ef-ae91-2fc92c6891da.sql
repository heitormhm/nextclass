-- Criar bucket público para fotos de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true);

-- Adicionar coluna avatar_url na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- RLS para permitir usuários fazerem upload de suas próprias fotos
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

-- RLS para permitir usuários atualizarem suas fotos
CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

-- RLS para permitir todos verem fotos de perfil (bucket público)
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- RLS para permitir usuários deletarem suas fotos
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND (auth.uid()::text = (storage.foldername(name))[1])
);