# OpenAPI Angular CLI Generator

Ferramenta de linha de comando (CLI) desenvolvida em Node.js e TypeScript para ler especificações OpenAPI (Swagger/Scalar) a partir de uma URL e gerar automaticamente a estrutura de frontend para Angular (Interfaces de Entrada/Saída e Services estruturados com HttpClient).

## Tecnologias Utilizadas
- **Node.js** e **TypeScript**
- **@apidevtools/swagger-parser** para download, validação e resolução de referências (`$ref`) do JSON/YAML.
- **Handlebars** como motor de templates reutilizáveis.
- **Commander** para gerenciar a interface de linha de comando.

## Parâmetros da CLI
- `--url` ou `-u`: URL do arquivo JSON/YAML contendo a especificação OpenAPI.
- `--output` ou `-o`: Pasta de destino onde a estrutura gerada será salva.

## Estrutura Gerada
A CLI gera duas pastas dentro do diretório de destino:
1. `models/`: Contém uma interface TypeScript por entidade da API, resolvendo dependências e importações necessárias automaticamente.
2. `services/`: Contém arquivos de Service do Angular (`@Injectable({ providedIn: 'root' })`) com o `HttpClient` injetado e métodos correspondentes aos verbos HTTP (GET, POST, PUT, DELETE, PATCH).

## Instalação e Execução

### Pré-requisitos
- Node.js (v18+)
- npm

### Passos
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Compile o projeto:
   ```bash
   npm run build
   ```

3. Execute a CLI diretamente:
   ```bash
   npm start -- -u <url-do-swagger> -o <pasta-destino>
   ```

## Testes
O projeto inclui testes de validação unitária. Para rodá-los:
```bash
npm test
```
