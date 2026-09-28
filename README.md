# cal-images

Constrói as imagens Docker do [cal.diy](https://github.com/calcom/cal.diy) (fork MIT do Cal.com) e publica no GHCR.

Existe porque o cal.diy não publica imagem própria, e porque construir na Railway é caro e frágil: o Dockerfile pede 6 GB de heap.

Uso: aba Actions → *build-cal-images* → *Run workflow*.
