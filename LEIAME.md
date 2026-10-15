# Órbita: organizador de demandas

Site pessoal para organizar as demandas que chegam do escritório. Você (administrador) registra e edita. Quem tiver o link entra como **visitante** e só visualiza.

**Telas**

- **Galáxia (3D)**: cada projeto é um planeta.
  - o anel mostra o status, o tamanho mostra o esforço e a cor mostra a célula;
  - o arco branco mostra o % de tarefas feitas;
  - o halo dourado marca prioridade alta e o anel vermelho marca uma barreira.
- **Kanban**: arraste os cartões entre as colunas. Ao soltar em *Encerrado*, o site pergunta se a demanda foi concluída, ficou só na pesquisa ou parou numa barreira.
- **Sprints**: ciclos de foco com objetivo, prazo e retrospectiva (o que andou, o que travou, o que aprendi).
- **Painel**: indicadores, demandas por célula, como as demandas terminam e as que estão abertas há mais tempo.

**Atalhos**

- `Ctrl + K`: busca e comandos.
- `N`: nova demanda.
- `Esc`: fecha painéis.
- Botão ⚡: **modo leve**, que desliga os efeitos 3D em PCs mais lentos.

---

## 1. Rodar no seu computador

1. Instale o **Node.js LTS** (https://nodejs.org).
2. Abra um terminal nesta pasta e rode:
   ```bash
   npm install
   npm run dev
   ```
3. Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

Sem configurar nada, o site abre em **modo demonstração**: os dados ficam só no seu navegador, com as demandas de exemplo. Clique em **Entrar** para testar a edição.

---

## 2. Configurar o Firebase (banco + login)

1. Acesse https://console.firebase.google.com e clique em **Criar projeto** (o Google Analytics pode ficar desativado).
2. Na página do projeto, clique no ícone **Web `</>`** para registrar um app, com o nome que quiser.
3. Copie os valores de `firebaseConfig` que aparecem.
4. Na pasta do projeto, copie `.env.example` para um arquivo chamado `.env` e cole os valores:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_ADMIN_EMAIL=murilo.brito@chebabi.com
   ```
5. Configure o login:
   1. Vá em **Authentication → Primeiros passos → Método de login** e ative **E-mail/senha**.
   2. Na aba **Usuários**, clique em **Adicionar usuário** e cadastre o seu e-mail e uma senha.
6. Crie o banco:
   1. Vá em **Firestore Database → Criar banco de dados**.
   2. Escolha o **modo de produção** e a região `southamerica-east1 (São Paulo)`.
7. Publique as regras de segurança:
   1. No Firestore, abra a aba **Regras**.
   2. Apague o conteúdo e cole o do arquivo `firestore.rules`.
   3. Clique em **Publicar**.
8. Rode `npm run dev` de novo, clique em **Entrar** e use o e-mail e a senha que você cadastrou.
9. *(Opcional)* No menu do seu usuário (canto superior direito), clique em **Importar dados de exemplo** para começar com as demandas atuais.

### Como a permissão funciona

- **Visitantes** (sem login) leem apenas projetos e sprints marcados como **Visível p/ visitantes**. Marque como **Só eu vejo** o que for interno.
- **Somente o seu e-mail** pode criar, editar ou excluir.
- As duas regras ficam no servidor (`firestore.rules`), não só na tela. Mesmo que alguém mexa no código do navegador, o Firebase recusa a gravação.
- O `apiKey` do Firebase não é uma senha: é normal ele aparecer no site publicado. A proteção vem das regras.
- Para trocar o e-mail do administrador, altere `VITE_ADMIN_EMAIL` no `.env` **e** o e-mail em `firestore.rules`, depois publique as regras de novo.

---

## 3. Publicar na Vercel

1. Crie um repositório **privado** no GitHub e envie esta pasta (o `.gitignore` já impede que `.env` e `node_modules` subam).
2. Acesse https://vercel.com, entre com o GitHub e clique em **Add New → Project**.
3. Importe o repositório. A Vercel detecta **Vite** sozinha.
4. Em **Environment Variables**, cadastre as mesmas variáveis do seu `.env`.
5. Clique em **Deploy** e anote o endereço gerado, por exemplo `orbita-xyz.vercel.app`.
6. No Firebase, vá em **Authentication → Configurações → Domínios autorizados** e adicione esse endereço. Sem isso, o login não funciona no site publicado.

Cada `git push` para o repositório publica uma nova versão automaticamente.

> Antes de divulgar o link, confirme com a gestão/TI se as descrições das demandas podem ficar num serviço externo. Evite colocar dados de clientes ou de processos nas descrições públicas.

---

## Estrutura

```
src/
  App.tsx              topo, abas, roteamento entre telas
  store.ts             estado global (Zustand) e regras de admin/visitante
  types.ts             modelo de dados (Projeto, Sprint, Tarefa…)
  data/repo.ts         camada de dados: Firebase ou modo demonstração
  data/seed.ts         demandas de exemplo
  lib/constants.ts     status, tipos, barreiras, cores
  views/Galaxia.tsx    cena 3D (react-three-fiber + drei + bloom)
  views/Kanban.tsx     quadro com arrastar e soltar (dnd-kit)
  views/Sprints.tsx    sprints de foco e retrospectivas
  views/Painel.tsx     indicadores
  components/          gaveta de detalhe, nova demanda, login, paleta Ctrl+K…
firestore.rules        regras de segurança do banco
vercel.json            redirecionamento para o React (SPA)
```

**Tecnologias:** React 18, TypeScript, Vite, Three.js / @react-three/fiber, Framer Motion, dnd-kit, Zustand e Firebase (Auth + Firestore).

**Ideias para próximas versões:** capturar demandas do Outlook/Teams, notificações de prazo, anexos por projeto e uma linha do tempo 3D das sprints.
