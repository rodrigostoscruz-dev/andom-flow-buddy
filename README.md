# Andon Signal Pro

Preciso fazer um aplicativo de controle Andom, vai servir para sinalização da produção para o almoxarifado e a qualidade
A produção conta com sete postos de trabalho (Cabeça, Conveyor, Mesa de Saida, Elétrica, Ponte, Plother/ICF, Integração), cada posto tera um login, o almoxarifado tera um login e o setor da qualidade tera outro login.
Este aplicativo vai servir para que a produção possa sinalizar atraves de uma tela o almoxarifado ou a qualidade, conforme escolhido pelo operador do posto.
Na tela do setor escolhido (Almoxarifado ou Qualidade) aparecera o nome do posto que sinalizou 

Nome do Aplicativo: Projeto - Andom

Controle de tempo: Tem que ter um controle de tempo que iniciara quando o posto chamar um dos setores ( Qualidade ou Almoxarifado) e se encerra quando o Operador dos postos da produção encerrar.
Isso sera para se ter um controle de quanto tempo esta demorando para que o setor seja atendido, sendo que tem que fazer uma opção para extrair dados para uma planilha para gerar um relátorio

Motivos dos chamados:

Almoxarifado : Posto Parado - Almox - Cor vermelho

Aguardando abastecimento de posto - Almox - Cor Orange

Aguardando abastecimento de kamban - Almox - Cor Orange

Aguardando qualidade - Qualidade

Dividir os chamados por login (Qualidade / Almox) para que cada um receba seu chamado direcionado .

Identificação de posto.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://andom-flow-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1255520-6a06-4b90-96ff-5e38226bdf06).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
