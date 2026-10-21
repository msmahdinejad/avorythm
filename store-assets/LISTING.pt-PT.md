# Chrome Web Store — European Portuguese (pt-PT)

## Nome

Avorythm — Dobragem em direto e legendas com IA

## Descrição breve

Tradução com IA do separador selecionado: dobragem em direto, legendas bilingues e leitor sincronizado.

## Descrição detalhada

Veja cursos, vídeos e filmes ou ouça podcasts na sua língua. O Avorythm utiliza IA para traduzir o áudio do separador do navegador que selecionar expressamente. Ouça a fala dobrada em direto, veja legendas no idioma de origem e traduzidas, ou mantenha o áudio original e leia apenas a tradução.

Escolha entre a reprodução de baixa latência na página original e o gravador e leitor sincronizados. A captura sincronizada avança à frente da reprodução, enquanto o leitor independente permite fazer pausas, procurar um ponto da gravação e ver em ecrã inteiro. A gravação pode ser terminada manualmente.

Controle quatro canais de forma independente: áudio original, áudio dobrado, legendas no idioma de origem e legendas traduzidas. Ajuste os níveis dos dois áudios, mova e redimensione a sobreposição das legendas e exporte um vídeo WebM personalizado e legendas SRT em separado. A gravação normal opcional também guarda as duas faixas de áudio em WAV e as duas faixas de legendas em SRT.

A extensão funciona de forma independente, sem a aplicação para computador, Python, FFmpeg, localhost ou um dispositivo de áudio virtual. A interface atual está disponível em inglês, persa e chinês simplificado; o idioma de destino da tradução é escolhido separadamente entre 79 opções de idioma.

Configuração: introduza nas definições a sua própria chave de API do Gemini, obtida no Google AI Studio, autorize expressamente o envio do áudio do separador selecionado para o Google Gemini, escolha um idioma e prima Start. O modo de maior precisão, opcional, utiliza o Groq Whisper para a transcrição, o Gemini para a tradução do texto e o Gemini 3.1 Flash Live para a fala. Requer uma chave do Groq, uma permissão de acesso ao anfitrião opcional e um consentimento separado para o envio do áudio.

Privacidade: a captura só começa depois de dar o seu consentimento e premir Start. O áudio e as transcrições do separador selecionado são enviados diretamente aos fornecedores de IA necessários para o processamento solicitado, nunca ao responsável pela manutenção do Avorythm. Sem anúncios, análise de utilização ou servidor intermediário operado pelo programador.

Por predefinição, as chaves de API são guardadas apenas durante a sessão. A opção de guardar neste dispositivo a chave de cada fornecedor é independente, facultativa e está desativada por predefinição. As cópias guardadas não são sincronizadas nem encriptadas pela extensão. Desativar essa opção elimina a cópia guardada no dispositivo; apagar uma chave elimina tanto a cópia no dispositivo como a da sessão.

A gravação normal das quatro saídas está desativada por predefinição. O modo sincronizado grava localmente para reprodução e exportação e mantém apenas a captura mais recente no armazenamento privado do Chrome. Os ficheiros transferidos são guardados em Downloads/Avorythm.

O Avorythm é gratuito e de código aberto. As quotas gratuitas e a disponibilidade dos modelos dos serviços externos de IA podem mudar. O processamento em direto requer tempo de comunicação pela rede e não garante latência nula nem uma tradução perfeita; confirme os conteúdos importantes. Os conteúdos protegidos por DRM e as páginas internas do navegador podem impedir a captura.

Código-fonte: https://github.com/msmahdinejad/avorythm

Guia do utilizador (em inglês): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Política de privacidade: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novidades da versão 1.1.18

- Synchronized player: buffered video is no longer thrown away when Chrome reports a decoder stall; playback skips holes in the live buffer and rebuilds only after repeated hard freezes.
- New manual **Subtitle timing** and **Dubbed voice timing** controls in the player, applied to playback, the exported video, and the downloaded SRT files.
- Smoother recordings: VP8 capture at a higher bitrate with a minimum frame rate, and an export step that no longer drops frames.
- On-page subtitles stay readable: choose scrolling lines or one sentence at a time, how many lines to show, and how long each line stays.
