# Matriz de Rastreabilidade de Requisitos (RTM)

Este documento estabelece a conexão entre os requisitos (mapeados a partir do Swagger e regras de negócio), os Casos de Teste executados e os Bugs identificados no projeto GoLedger Challenge.

---

## Resumo de Cobertura
Nota Visual: Para acessar a matriz detalhada com formatação avançada, filtros e status de automação, abra o arquivo: [RTM.html](./RTM.html)

| Categoria | Requisitos Mapeados | Testes Associados | Status de Cobertura |
| :--- | :---: | :---: | :--- |
| Autenticação | 8 | 10 | Falha (Bugs Críticos) |
| Books (API) | 6 | 7 | Falha (Integração Ledger) |
| Books (Web) | 4 | 4 | Falha (Interface/UX) |
| Libraries & Persons | 4 | 4 | Sucesso |
| Integridade Ledger | 4 | 3 | Falha (Persistência) |

---

## Objetivo da Matriz
A RTM garante a integridade do processo de QA através dos seguintes pontos:
1. Garantia de que todos os endpoints e funcionalidades descritos no Swagger foram validados.
2. Rastreabilidade direta entre uma falha de requisito e seu respectivo Bug ID.
3. Identificação de lacunas na cobertura de testes manuais e automatizados.

---
Documento gerado para o processo seletivo GoLedger por Felipe Castro.