# Imagens

Esta pasta contém as imagens das igrejas e clérigos.

## Placeholder

Quando uma igreja não possui imagem (`imageUrl` ausente), o sistema utiliza automaticamente o arquivo `via-fidei-logo.png`.

## Estrutura (flat)

```
/public/images/
  via-fidei-logo.png              # Logo / imagem padrão
  sao-paulo-apostolo.jpg          # Igreja 46
  pe-manoel-jose-dos-santos.jpg   # Pároco da igreja 46
  dc-inacio-filho.jpg             # Diácono da igreja 46
```

## Convenção de nomes

- **Igrejas**: `{slug}.jpg` (ex: `sao-paulo-apostolo.jpg`)
- **Padres**: `pe-{nome-slug}.jpg` (ex: `pe-manoel-jose-dos-santos.jpg`)
- **Diáconos**: `dc-{nome-slug}.jpg` (ex: `dc-inacio-filho.jpg`)
- **Monsenhores**: `mons-{nome-slug}.jpg`
- **Freis**: `fr-{nome-slug}.jpg`

## Preview (V1)

As imagens são armazenadas localmente para preview. Em V2, considerar migração para storage em nuvem (Vercel Blob, Supabase Storage, Cloudinary).
