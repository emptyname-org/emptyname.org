# {{ .Title }}

{{ .RawContent | replaceRE `(?m)^\{\{< /?opening >\}\}\r?\n?` "" }}
---
Source: {{ .Permalink }}
Licence: CC0 / Free as Air - https://emptyname.org/faal
