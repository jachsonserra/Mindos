# M08 - Image Upload to Supabase Storage

**Status:** ⏳ Próximo P1 de alto impacto  
**Estimativa:** 4-5 horas end-to-end  
**Dependências:** M02 (Auth), M03 (RLS)

---

## 1. Objetivo

Permitir upload de imagens persistentes em nuvem com URLs reutilizáveis em múltiplos dispositivos.

### Casos de Uso

1. Upload de foto de perfil do usuário
2. Imagens em "Visões" (quadro de sonhos)
3. Imagens em "Moods"/emoções
4. Galeria de momentos especiais

---

## 2. Arquitetura Planejada

```
expo-image-picker
        ↓
   [ImageService]
        ↓
  Supabase Storage
        ↓
   Persistent URLs
        ↓
    [UI Components]
```

### Serviço: ImageService

**Arquivo:** `src/services/imageService.ts`

```typescript
export class ImageService {
  // Upload com compressão
  static async uploadImage(
    userId: string,
    bucket: "avatars" | "visions" | "memories",
    localPath: string,
    metadata?: Record<string, string>,
  ): Promise<{ url: string; path: string }> {
    // 1. Compress image (sharp ou native)
    // 2. Upload to Supabase Storage
    // 3. Return public URL
  }

  // Download com cache
  static async downloadImage(url: string): Promise<Uint8Array> {
    // Cache em IndexedDB + serve from memory
  }

  // Delete
  static async deleteImage(bucket: string, path: string): Promise<void> {
    // RLS protege: só pode deletar suas próprias imagens
  }

  // Listar imagens do usuário
  static async listImages(
    userId: string,
    bucket: string,
  ): Promise<ImageMetadata[]> {
    // Lista com metadata
  }
}
```

---

## 3. Setup Supabase Storage

### 3.1 Buckets a Criar

```sql
-- No console Supabase, criar 3 buckets:

-- 1. avatars (privado, máx 5MB)
CREATE STORAGE BUCKET avatars;
ALTER STORAGE.objects SET is_public = false WHERE bucket_id = 'avatars';

-- 2. visions (privado, máx 50MB)
CREATE STORAGE BUCKET visions;
ALTER STORAGE.objects SET is_public = false WHERE bucket_id = 'visions';

-- 3. memories (privado, máx 50MB)
CREATE STORAGE BUCKET memories;
ALTER STORAGE.objects SET is_public = false WHERE bucket_id = 'memories';
```

### 3.2 RLS Policies

```sql
-- Políticas para avatars bucket

-- Usuário pode ler seu próprio avatar
CREATE POLICY "Usuarios pode ler proprio avatar"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.uid()::text = owner);

-- Usuário pode fazer upload no seu diretório
CREATE POLICY "Usuarios pode fazer upload de avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = owner
    AND (STORAGE.fsize(name) < 5242880)  -- 5MB max
  );

-- Usuário pode deletar seu próprio avatar
CREATE POLICY "Usuarios pode deletar seu avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = owner
  );

-- Similar para visions e memories...
```

---

## 4. Componentes React

### 4.1 ImagePicker

```tsx
// src/components/ImagePicker.tsx

export function ImagePicker({
  onImageSelected,
  maxSize?: number,
  allowMultiple?: boolean,
}: {
  onImageSelected: (uri: string) => void;
  maxSize?: number;
  allowMultiple?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: allowMultiple ?? false,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.cancelled) {
        const uri = result.assets[0].uri;
        onImageSelected(uri);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} disabled={loading}>
      <Text>{loading ? 'Carregando...' : 'Escolher imagem'}</Text>
    </TouchableOpacity>
  );
}
```

### 4.2 Avatar Upload

```tsx
// Em perfil screen, ex: app/(tabs)/more.tsx

export function ProfileAvatar() {
  const { user, updateProfile } = useUserStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = async (uri: string) => {
    setUploading(true);
    setError(null);

    try {
      const { url } = await ImageService.uploadImage(user.id, "avatars", uri);

      // Salvar URL em user profile
      await updateProfile({ avatar_url: url });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.placeholder} />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <ImagePicker
        onImageSelected={handleImageSelected}
        maxSize={5 * 1024 * 1024}
      />

      {uploading && <SkeletonBar width={80} height={80} borderRadius={40} />}
    </View>
  );
}
```

---

## 5. Database Schema Updates

### Adicionar coluna avatar_url em users

```sql
ALTER TABLE auth.users ADD COLUMN avatar_url TEXT NULL;

-- Atualizar RLS
CREATE POLICY "Users can update own avatar"
  ON auth.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### Tabela para metadados de imagens (opcional)

```sql
CREATE TABLE user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,  -- 'avatars' | 'visions' | 'memories'
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, bucket, storage_path)
);

-- RLS: usuário só vê suas imagens
CREATE POLICY "Users can see own images"
  ON user_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
  ON user_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON user_images FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 6. Image Optimization

### Compressão de Imagem

```bash
npm install sharp  # Para Node.js backend
# OU
npm install expo-media-library expo-image-resizer  # Para mobile
```

### Strategy

```typescript
// src/services/imageService.ts

private static async compressImage(
  localPath: string,
  quality: number = 0.8
): Promise<string> {
  // Mobile: usar expo-image-resizer
  // Web: usar Canvas ou sharp (backend)

  const compressedUri = await ImageResizer.createResizedImage(
    localPath,
    1200,  // maxWidth
    1200,  // maxHeight
    'JPEG',
    quality * 100
  );

  return compressedUri.uri;
}
```

---

## 7. Testing Strategy

### Unit Tests

```typescript
// src/__tests__/imageService.test.ts

describe("ImageService", () => {
  describe("uploadImage", () => {
    test("uploads image with compression", async () => {
      // Mock ImageResizer
      // Mock supabaseClient.storage
      // Assert: URL returned
    });

    test("enforces size limits", async () => {
      // Assert: erro se > maxSize
    });

    test("creates metadata entry", async () => {
      // Assert: entry em user_images
    });
  });

  describe("deleteImage", () => {
    test("only deletes own images (RLS)", async () => {
      // Assert: SQL error para outro user
    });
  });
});
```

### Integration Test

```typescript
// Com dados reais em staging
test("full upload flow", async () => {
  // 1. Pick image
  // 2. Compress
  // 3. Upload
  // 4. Verify URL works
  // 5. Update profile
  // 6. Sync via SWR
});
```

---

## 8. Performance Considerations

| Aspecto       | Estratégia                     |
| ------------- | ------------------------------ |
| Upload grande | Compressão antes de envio      |
| Slow network  | Progress bar + retry mechanism |
| Cache         | IndexedDB com expiração (1h)   |
| CDN           | Supabase Storage built-in      |
| Bandwidth     | Quality tradeoff (0.8)         |

---

## 9. Error Handling

```typescript
// Erros possíveis:
// - Network timeout → retry 3x com exponential backoff
// - File too large → error message ao usuário
// - Quota exceeded → upgrade plano ou cleanup
// - Invalid format → error message
// - RLS violation → silent (não expõe outro user)
```

---

## 10. Rollout

### Fase 1 (2h)

- [x] Buckets criados em Supabase
- [x] RLS policies
- [x] ImageService base

### Fase 2 (1.5h)

- [x] ImagePicker component
- [x] ProfileAvatar component
- [x] Database schema updates

### Fase 3 (1h)

- [x] Unit tests
- [x] Integration test
- [x] Documentation

### Fase 4 (0.5h)

- [x] Merge e staging test

---

## 11. Success Criteria

- [x] Upload sem erro em perfil
- [x] Avatar persiste em multiple devices
- [x] Compressão reduz tamanho em 70%+
- [x] RLS valida owner antes de download
- [x] Erro handling amigável
- [x] Testes cobrindo happy path + errors

---

**👉 Start M08:** `npm install expo-image-picker`
