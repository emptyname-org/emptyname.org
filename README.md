# emptyname.org (site engine)

The Hugo engine behind [emptyname.org](https://emptyname.org): templates, styles, scripts, and configuration. Free as air like everything else in the project, so it lives here in the open.

This is the engine only. The content (the paintings, generative works, and texts) is not here, by design. The work lives at its home, [emptyname.org](https://emptyname.org), and nowhere else is canonical. Clone this and you get the machine that renders the site, not the art it renders.

## What is here

- `www/layouts` templates, partials, shortcodes (the machine-first layer: HTML + `.md`/`.txt` twins, JSON-LD, RSS, sitemaps, `llms.txt`)
- `www/assets`, `www/static/css`, `www/static/js`, `www/static/fonts` styles, scripts, fonts
- `www/i18n`, `www/archetypes`, `www/hugo.toml` localization, scaffolding, configuration
- `www/scripts` `stamp-media.sh` (privacy-scrub + invisible CC0/source stamping of media) and `check-orphans.py`
- `www/static/contact/message.php` the proof-of-work-gated contact handler (server paths redacted, set via env)
- `build.sh` build to `www/public`

## Build

```sh
./build.sh
# or: cd www && hugo
```

You need [Hugo](https://gohugo.io) (extended). With no content present the build is an empty shell, which is the point.

## Free as air

Everything here is released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (see `LICENSE`). No copyright, nothing reserved, nothing owed. Copy it, change it, build on it, sell it, give it away, no permission and no attribution required. Free as air, [emptyname.org/faal](https://emptyname.org/faal).
