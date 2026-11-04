# Imagens

Esta pasta contém as imagens das igrejas e clérigos.

## Placeholder

Quando uma igreja não possui imagem (`imageUrl` ausente), o sistema utiliza automaticamente o arquivo `via-fidei-logo.png`.

O logo é um PNG com paleta de 1024 px e cerca de 8 KB (VF-090). Ao trocá-lo, mantenha o arquivo leve: ele também é baixado como imagem padrão. Favicon e ícone Apple não usam este arquivo: ficam em `app/icon.png` e `app/apple-icon.png`.

## Estrutura (flat)

```
/public/images/
  via-fidei-logo.png              # Logo / imagem padrão
  sao-paulo-apostolo.jpg              # Igreja 46
  pe-jose-elielton.jpeg                # Pároco atual da igreja 46
  diac-denis-francisco-menezes.jpeg    # Diácono atual da igreja 46
  pe-manoel-jose-dos-santos.jpg        # Pároco anterior da igreja 46
  dc-inacio-filho.jpg                  # Diácono anterior da igreja 46
```

## Convenção de nomes

- **Igrejas**: `{slug}.jpg` (ex: `sao-paulo-apostolo.jpg`)
- **Padres**: `pe-{nome-slug}.jpg` (ex: `pe-manoel-jose-dos-santos.jpg`)
- **Diáconos**: `dc-{nome-slug}.jpg` (ex: `dc-inacio-filho.jpg`)
- **Monsenhores**: `mons-{nome-slug}.jpg`
- **Freis**: `fr-{nome-slug}.jpg`

## Preview (V1)

As imagens são armazenadas localmente para preview. Em V2, considerar migração para storage em nuvem (Vercel Blob, Supabase Storage, Cloudinary).
