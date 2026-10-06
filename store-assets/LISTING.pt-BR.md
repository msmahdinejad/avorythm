# Chrome Web Store — Brazilian Portuguese (pt-BR)

## Nome

Avorythm — Dublagem ao vivo e legendas com IA

## Descrição curta

Tradução com IA para a aba selecionada: dublagem ao vivo, legendas bilíngues e um player sincronizado.

## Descrição detalhada

Assista a cursos, vídeos e filmes ou ouça podcasts no seu idioma. O Avorythm usa IA para traduzir o áudio da aba do navegador que você selecionar explicitamente. Ouça a fala dublada ao vivo, veja legendas no idioma original e traduzidas ou mantenha o áudio original e leia apenas a tradução.

Escolha a reprodução de baixa latência na página original ou o gravador e player sincronizados. A captura sincronizada avança à frente da reprodução, enquanto o player independente permite pausar, avançar ou retroceder e usar a tela cheia. Você pode encerrar a gravação manualmente.

Controle quatro canais de forma independente: áudio original, áudio dublado, legendas no idioma original e legendas traduzidas. Ajuste separadamente o volume dos dois áudios, mova e redimensione as legendas sobrepostas e exporte um vídeo WebM personalizado e legendas SRT separadas. A gravação comum opcional também salva as duas faixas de áudio em WAV e as duas faixas de legendas em SRT.

A extensão funciona de forma independente, sem aplicativo para computador, Python, FFmpeg, localhost ou dispositivo de áudio virtual. A interface atual está disponível em inglês, persa e chinês simplificado; o idioma de destino da tradução é escolhido separadamente entre 79 opções.

Configuração: insira sua própria chave de API do Gemini, obtida no Google AI Studio, em Configurações; dê seu consentimento explícito para enviar o áudio da aba selecionada ao Google Gemini; escolha um idioma e pressione Iniciar. O modo de maior precisão, opcional, usa Groq Whisper para transcrição, Gemini para tradução de texto e Gemini 3.1 Flash Live para fala. Ele exige uma chave do Groq, uma permissão opcional de acesso ao host e consentimento separado para o envio de áudio.

Privacidade: a captura só começa após seu consentimento e após você pressionar Iniciar. O áudio e as transcrições da aba selecionada são enviados diretamente aos provedores de IA necessários para o processamento solicitado, nunca ao responsável pelo Avorythm. Não há anúncios, análises de uso nem servidor intermediário operado pelo desenvolvedor.

Por padrão, as chaves de API são mantidas apenas durante a sessão. Você pode optar por lembrar a chave de cada provedor neste dispositivo separadamente; essa opção vem desativada por padrão. As cópias armazenadas não são sincronizadas nem criptografadas pela extensão. Desativar essa opção exclui a cópia do dispositivo; apagar uma chave exclui as cópias do dispositivo e da sessão.

A gravação comum das quatro saídas vem desativada por padrão. O modo sincronizado grava localmente para reprodução e exportação e mantém apenas a captura mais recente no armazenamento privado do Chrome. Os arquivos baixados são salvos em Downloads/Avorythm.

O Avorythm é gratuito e de código aberto. As cotas gratuitas e a disponibilidade dos modelos de serviços externos de IA podem mudar. O processamento ao vivo depende do tempo de resposta da rede e não garante latência zero nem tradução perfeita; confira conteúdos importantes. Mídias protegidas por DRM e páginas internas do navegador podem impedir a captura.

Código-fonte: https://github.com/msmahdinejad/avorythm

Guia do usuário (em inglês): https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP.md

Política de privacidade: https://github.com/msmahdinejad/avorythm/blob/main/PRIVACY.md

## Novidades da versão 1.1.16

- Seleção de idiomas mais fácil: os idiomas mais populares aparecem primeiro, com variantes de chinês e português claramente identificadas.
- Nova documentação e novos recursos do projeto em alemão, francês, italiano, russo e árabe.
- Imagens da loja atualizadas com base na interface real do produto.
