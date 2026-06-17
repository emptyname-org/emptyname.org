+++
title = "{{ replace .File.ContentBaseName "-" " " | title }}"
date = "{{ .Date }}"
draft = false
[params]
  license = "CC0-1.0"
  licenseURL = "https://emptyname.org/faal"
# Add this work to the sidebar menu. Remove this block to keep it off the menu.
# Lower weight = higher in the list. Existing works use 2–10.
[menu.main]
  weight = 50
+++

Write the work or essay here.

Drop images / audio / video in THIS folder and reference them by filename — they
resolve automatically and get alt-text + schema.org metadata:

    ![An ekphrastic description of the image.](my-painting.jpg)

…or reference shared media under /uploads/… , or embed a player:

    <video controls preload="metadata" playsinline><source src="my-video.mp4" type="video/mp4"></video>
