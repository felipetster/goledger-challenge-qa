# Relatório de Bugs — Desafio GoLedger QA

**Candidato:** Felipe Castro  
**Repositório:** [https://github.com/felipetster/goledger-challenge-qa](https://github.com/felipetster/goledger-challenge-qa)  
**Data:** 04/04/2026  
**Escopo:** API REST em Go (`api/`) e Front-end em React (`web/`)

---

## Resumo dos Achados

| ID | Título do Bug | Componente | Severidade |
| :--- | :--- | :--- | :--- |
| **BUG-001** | Logout não limpa o token JWT do navegador | Web | **Crítica** |
| **BUG-002** | Login valida apenas o tamanho da senha, não o valor | API | **Crítica** |
| **BUG-003** | Rota de DELETE aberta (sem autenticação) | API | **Crítica** |
| **BUG-004** | Endpoint `/me` expõe a senha do usuário em texto plano | API | **Crítica** |
| **BUG-005** | Armazenamento de senhas sem Hash (Texto Plano) | API | **Alta** |
| **BUG-006** | Botão de criar livro não envia o Token (Erro 401) | Web | **Alta** |
| **BUG-007** | Cálculo de paginação (offset) está pulando resultados | API | **Alta** |
| **BUG-008** | Atualização de Tenant não persiste na Blockchain | API | **Alta** |
| **BUG-009** | Busca sem filtro de gênero retorna sempre vazio | API | **Alta** |
| **BUG-010** | Botão "Anterior" da paginação trava na página 1 | Web | **Média** |
| **BUG-011** | Mensagens de erro no Front são genéricas demais | Web | **Média** |
| **BUG-012** | Cadastro de usuário sem confirmação de senha | Web | **Baixa** |

---

## Detalhamento dos Bugs Críticos

### BUG-001 — Logout "fake" (Não limpa o JWT)
* **Onde:** `web/src/App.tsx`
* **Severidade:** **Crítica**
* **Descrição:** Ao clicar em Logout, o sistema reseta o estado da interface, mas o token permanece no `localStorage`. Ao atualizar a página (F5), o usuário é logado automaticamente.
* **Como reproduzir:** Logar -> Clicar em Logout -> Pressionar F5.
* **Sugestão de Correção:** Invocar a função `removeToken()` dentro do `handleLogout`.

### BUG-002 — Validação de senha por "tamanho"
* **Onde:** `api/handlers/auth.go`
* **Severidade:** **Crítica**
* **Descrição:** O login valida se a senha enviada tem o mesmo número de caracteres da senha real, ignorando o conteúdo.
* **Como reproduzir:** Tentar logar com `12345678` (8 caracteres) para o usuário admin (cuja senha real `admin123` também tem 8).
* **Sugestão de Correção:** Substituir a comparação de `len(password)` por uma comparação real de strings ou hash.

### BUG-003 — DELETE /books sem autenticação
* **Onde:** `api/routes/routes.go`
* **Severidade:** **Crítica**
* **Descrição:** A rota de deleção foi registrada fora do middleware de autenticação, permitindo que qualquer pessoa delete livros via API.
* **Sugestão de Correção:** Mover `api.DELETE("/books", ...)` para dentro do grupo protegido por `middleware.AuthRequired()`.

### BUG-004 — Exposição de senha no `/me`
* **Onde:** `api/models/user.go`
* **Severidade:** **Crítica**
* **Descrição:** O objeto retornado no perfil do usuário inclui o campo de senha em texto claro.
* **Sugestão de Correção:** Adicionar a tag ``json:"-"`` no campo `Password` da struct `User`.

---

## Outros Problemas de Alta Severidade

* **BUG-006 (Web):** A função `createBook` em `web/src/api.ts` não inclui o header de autorização, resultando em erro 401 constante ao tentar cadastrar livros.
* **BUG-007 (API):** Erro de lógica no offset da paginação em `handlers/books.go`. O cálculo atual (`page * limit`) ignora a primeira página de resultados. O correto é `(page - 1) * limit`.
* **BUG-008 (API):** Uso de `ccapi.Query` (leitura) em vez de `ccapi.Invoke` (escrita) no endpoint de atualização de Tenant. Os dados não são persistidos no ledger.

---

## Sugestões de Melhoria (UX/Qualidade)
* **Tratamento de Erros:** As mensagens no Front-end devem ser dinâmicas para informar ao usuário se o erro foi de rede, permissão ou validação.
* **Segurança de Cadastro:** Implementar campo de "Confirmação de Senha" e validação de força de senha no registro.

---
*Relatório gerado como parte do processo seletivo GoLedger.*