/**
 * SCRIPT DE MIGRAÇÃO AUTOMÁTICA (SEED) - SR. MENDES
 * 
 * Este script insere os clientes do CSV no banco de dados se eles ainda não existirem.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const novosClientes = [
  {
    "nome": "Ruan Pablo Felix De Sá",
    "telefone": "5531971056888@s.whatsapp.net",
    "email": "ruanxpablo1000@gmail.com"
  },
  {
    "nome": "Alberto Henrique Antunes Carmo",
    "telefone": "5531996905386@s.whatsapp.net",
    "email": "albertohenriqueac7@gmail.com"
  },
  {
    "nome": "Marlon Augusto",
    "telefone": "5531982092100@s.whatsapp.net",
    "email": "marlonaugusto577@gmail.com"
  },
  {
    "nome": "THIAGO ALVES DE ALMEIDA SILVA",
    "telefone": "5531983577581@s.whatsapp.net",
    "email": "thiagomoeda2102@gmail.com"
  },
  {
    "nome": "Lucas Domingos",
    "telefone": "5531984929098@s.whatsapp.net",
    "email": "lucasdomingosmoura123@gmail.com"
  },
  {
    "nome": "Guilherme Marra",
    "telefone": "5531971761777@s.whatsapp.net",
    "email": "guilhermemarra@msn.com"
  },
  {
    "nome": "George Luiz",
    "telefone": "5531996605142@s.whatsapp.net",
    "email": "george666666@hotmail.com"
  },
  {
    "nome": "João Pedro da Silva Amorim",
    "telefone": "5531999631133@s.whatsapp.net",
    "email": "joaopedrozx.116@gmail.com"
  },
  {
    "nome": "Lucas Junior Rodrigues Sousa",
    "telefone": "5531982778115@s.whatsapp.net",
    "email": "lucas28031995jr@gmail.com"
  },
  {
    "nome": "Phillemon Augusto",
    "telefone": "5531984853568@s.whatsapp.net",
    "email": "phillesilva2021@gmail.com"
  },
  {
    "nome": "André Jaime Pereira De Sousa",
    "telefone": "5531999525593@s.whatsapp.net",
    "email": "geovanacruz094@gmail.com"
  },
  {
    "nome": "Caique Alves Amorim",
    "telefone": "5531999310265@s.whatsapp.net",
    "email": "caiquea533@gmail.com"
  },
  {
    "nome": "Luiz Fernando Carmo Braga",
    "telefone": "5531998401996@s.whatsapp.net",
    "email": "carmobragaluizfernando@gmail.com"
  },
  {
    "nome": "Wellington Cesar dos Santos",
    "telefone": "5531999183355@s.whatsapp.net",
    "email": "Wellingtoncesar@hotmail.com"
  },
  {
    "nome": "Giovanni samuel",
    "telefone": "5531996455509@s.whatsapp.net",
    "email": "Giovannimoedamg@gmail.com"
  },
  {
    "nome": "Arthur Almeida",
    "telefone": "5531999377073@s.whatsapp.net",
    "email": "thursouza0712@gmail.com"
  },
  {
    "nome": "Carlos Roberto Augusto de Araújo Jr",
    "telefone": "5531984249598@s.whatsapp.net",
    "email": "Craajr@hotmail.com"
  },
  {
    "nome": "Alessandro Gonçalves de sousa",
    "telefone": "5531996301119@s.whatsapp.net",
    "email": "alessandro98704222@gmail.com"
  },
  {
    "nome": "João Pedro de jesus",
    "telefone": "5531971540284@s.whatsapp.net",
    "email": "joaopedro.jpjg22@gmail.com"
  },
  {
    "nome": "ALAN CHARLES DOS SANTOS",
    "telefone": "5531971226452@s.whatsapp.net",
    "email": "alancharles588@gmail.com"
  },
  {
    "nome": "Carlos Eduardo Silva Santos",
    "telefone": "5531983238116@s.whatsapp.net",
    "email": "dudu.ssilva77@gmail.com"
  },
  {
    "nome": "Kaique araujo",
    "telefone": "5531999711221@s.whatsapp.net",
    "email": "kaiquearaujodsgn@gmail.com"
  },
  {
    "nome": "Emerson Charles De Oliveira Silva",
    "telefone": "5531998404800@s.whatsapp.net",
    "email": "EmersonCharles81@gmail.com"
  },
  {
    "nome": "Emerson Resende",
    "telefone": "5531996563767@s.whatsapp.net",
    "email": "emersoncrucilandiamg@gmail.com"
  },
  {
    "nome": "Gabriel Ferreira",
    "telefone": "5531983664187@s.whatsapp.net",
    "email": "gabrielferreiralima83@gmail.com"
  },
  {
    "nome": "Dayane Sousa",
    "telefone": "5531995019750@s.whatsapp.net",
    "email": "dayanesousa93980@gmail.com"
  },
  {
    "nome": "Warlei Custódio Mendes",
    "telefone": "5531982101090@s.whatsapp.net",
    "email": "warleimendes03@gmail.com"
  },
  {
    "nome": "JOSE LEONE FERREIRA DE SOUZA",
    "telefone": "5533999780792@s.whatsapp.net",
    "email": "Joseleoneferreira606@gmail.com"
  },
  {
    "nome": "Alvaro Felipe",
    "telefone": "5531984400531@s.whatsapp.net",
    "email": "alvarofelipe928@icloud.com"
  },
  {
    "nome": "ROBERT LUCINDO DA SILVA",
    "telefone": "5531997565729@s.whatsapp.net",
    "email": "robertniquim@gmail.com"
  },
  {
    "nome": "Vitor",
    "telefone": "5531983798688@s.whatsapp.net",
    "email": "bonecaov@gmail.com"
  },
  {
    "nome": "jonas pimenta",
    "telefone": "5531982731066@s.whatsapp.net",
    "email": "jonaspimenta110281@gmail.com"
  },
  {
    "nome": "Mateus henrique",
    "telefone": "5531984381706@s.whatsapp.net",
    "email": "mateushenriquegamerbatista1010@gmail.com"
  },
  {
    "nome": "William Antônio",
    "telefone": "5531996320299@s.whatsapp.net",
    "email": "gestao.williamfonseca@yahoo.com"
  },
  {
    "nome": "Yuri Kaylan Félix de Sá",
    "telefone": "5531998941465@s.whatsapp.net",
    "email": "yurikailan17@gmail.com"
  },
  {
    "nome": "Regiane Rodrigues",
    "telefone": "5531993784704@s.whatsapp.net",
    "email": "gianesilvars07@gmail.com"
  },
  {
    "nome": "Gustavo Moura",
    "telefone": "5531982133476@s.whatsapp.net",
    "email": "guhmoura696@gmail.com"
  },
  {
    "nome": "Ronaldo Pereira dos santos",
    "telefone": "5531997148113@s.whatsapp.net",
    "email": "ronaldosantos0824@gmail.com"
  },
  {
    "nome": "Vitor Gabriel Mendes Silva",
    "telefone": "5531984909825@s.whatsapp.net",
    "email": "vitorgabriel270504@gmail.com"
  },
  {
    "nome": "Vanderlucio Gabriel de Moura",
    "telefone": "5531984053448@s.whatsapp.net",
    "email": "vanderluciomoura@gmail.com"
  },
  {
    "nome": "Savio Oliveira",
    "telefone": "5531999251227@s.whatsapp.net",
    "email": "saviopereira011@gmail.com"
  },
  {
    "nome": "ANDRE EDUARDO DA SILVA",
    "telefone": "5531988117294@s.whatsapp.net",
    "email": "andreedus@hotmail.com"
  },
  {
    "nome": "Jonas pimenta campos",
    "telefone": "5531982731066@s.whatsapp.net",
    "email": "Jonaspimenta@gmail.com"
  },
  {
    "nome": "Pablo Felipe",
    "telefone": "5531999591815@s.whatsapp.net",
    "email": "pablofelipe19999@gmail.com"
  },
  {
    "nome": "Fernando Alves",
    "telefone": "5531983160603@s.whatsapp.net",
    "email": "fernandosarinha1223@gmail.com"
  },
  {
    "nome": "Samuel Silva",
    "telefone": "5531995288747@s.whatsapp.net",
    "email": "muelcls@gmail.com"
  },
  {
    "nome": "Gabriel Farid",
    "telefone": "5531982239527@s.whatsapp.net",
    "email": "gabrielfaridbraga@gmail.com"
  },
  {
    "nome": "Edvander Moura",
    "telefone": "5531993061336@s.whatsapp.net",
    "email": "edvander.moura@icloud.com"
  },
  {
    "nome": "Jonas Hermenegildo",
    "telefone": "5531999898946@s.whatsapp.net",
    "email": "renovvel@gmail.com"
  },
  {
    "nome": "Geraldo Felipe Fernandes Da silva",
    "telefone": "5531981170920@s.whatsapp.net",
    "email": "geraldo2020fernandes@gmail.com"
  },
  {
    "nome": "Jaine Fernandes",
    "telefone": "5531972613140@s.whatsapp.net",
    "email": "jainefernan0@icloud.com"
  },
  {
    "nome": "Guilherme Augusto",
    "telefone": "5531982329859@s.whatsapp.net",
    "email": "guilhermehermegildo12@gmail.com"
  },
  {
    "nome": "Miguel de Carvalho Carmo",
    "telefone": "5531983099093@s.whatsapp.net",
    "email": "miguelcarmo12@gmail.com"
  },
  {
    "nome": "CARLOS ROBERTO AUGUSTO DE ARAUJO",
    "telefone": "5531984447337@s.whatsapp.net",
    "email": "carlosmoeda@bol.com.br"
  },
  {
    "nome": "Ednei Antunes Amorim",
    "telefone": "5531999676561@s.whatsapp.net",
    "email": "edneiantunes289@gmail.com"
  },
  {
    "nome": "Alisson egidio da rocha",
    "telefone": "5531982009060@s.whatsapp.net",
    "email": "alisonegdeo5@gmail.com"
  },
  {
    "nome": "Matheus Cardoso Viana",
    "telefone": "5531995159922@s.whatsapp.net",
    "email": "matheuscardoso1871234@gmail.com"
  },
  {
    "nome": "Jhon Lucas",
    "telefone": "5531984361498@s.whatsapp.net",
    "email": "Jhonlucasserafim20@gmail.com"
  },
  {
    "nome": "Lucas Silva Quirino",
    "telefone": "5531999284081@s.whatsapp.net",
    "email": "Lqsilva117@gmail.com"
  },
  {
    "nome": "Matheus felipe santos de Paula",
    "telefone": "5531993707727@s.whatsapp.net",
    "email": "Matheusfelipe0608@gmail.com"
  },
  {
    "nome": "Miguel Lamartine",
    "telefone": "5531983815665@s.whatsapp.net",
    "email": "lamartinemiguel0@gmail.com"
  },
  {
    "nome": "Wellington Anastácio Queiroz",
    "telefone": "5531995122186@s.whatsapp.net",
    "email": "Anastacioqueirozwellington@gmail.com"
  },
  {
    "nome": "João Pedro Silva Corrêa",
    "telefone": "5535992757875@s.whatsapp.net",
    "email": "jp90639578@gmail.com"
  },
  {
    "nome": "Alyne Braga",
    "telefone": "5531984463855@s.whatsapp.net",
    "email": "alynelapa@yahoo.com.br"
  },
  {
    "nome": "Juliano Azevedo",
    "telefone": "5531984044284@s.whatsapp.net",
    "email": "julianoazevedosl@gmail.com"
  },
  {
    "nome": "Wellington Suares Araujo",
    "telefone": "5531993148657@s.whatsapp.net",
    "email": "wellingtonsuaresaraujo@gmail.com"
  },
  {
    "nome": "Sávio do Carmo Lapa Santos",
    "telefone": "553198421664@s.whatsapp.net",
    "email": "saviolapa@gmail.com"
  },
  {
    "nome": "Heinner Marcelo de Paula",
    "telefone": "5531993000249@s.whatsapp.net",
    "email": "heinner79@gmail.com"
  },
  {
    "nome": "Regiane Rodrigues",
    "telefone": "5531993784704@s.whatsapp.net",
    "email": "Gianesilva.192@gmail.com"
  },
  {
    "nome": "Nicolas Emanuel",
    "telefone": "5531998250857@s.whatsapp.net",
    "email": "nicolas.e.5050@gmail.com"
  },
  {
    "nome": "Samuel junior pereira Braga",
    "telefone": "5531997907981@s.whatsapp.net",
    "email": "samuelbragajunior4@gmail.com"
  },
  {
    "nome": "Carlos Alexandre da silva/ Lilim",
    "telefone": "5531971315726@s.whatsapp.net",
    "email": "lilim@123gmail.com"
  },
  {
    "nome": "Rodrigo Júnior Fernandes",
    "telefone": "5531999504603@s.whatsapp.net",
    "email": "rodrigojf.arq@gmail.com"
  },
  {
    "nome": "Gustavo Henrique",
    "telefone": "5531999718880@s.whatsapp.net",
    "email": "gustavohfs1999@icloud.com"
  },
  {
    "nome": "Samuel henrique",
    "telefone": "5531984547831@s.whatsapp.net",
    "email": "samuelhcs535@gmail.com"
  },
  {
    "nome": "Gabriel Cardoso",
    "telefone": "5531982619986@s.whatsapp.net",
    "email": "gabbrielcardoso@gmail.com"
  },
  {
    "nome": "Alexandre José Pereira Pinto",
    "telefone": "5531995643308@s.whatsapp.net",
    "email": "alexandrejose.tst@gmail.com"
  },
  {
    "nome": "Vinicius Gomes",
    "telefone": "5531982151675@s.whatsapp.net",
    "email": "jadepaduaa@gmail.com"
  },
  {
    "nome": "Daniel Felix Sellos",
    "telefone": "5531984718412@s.whatsapp.net",
    "email": "danielsellos2012@gmail.com"
  },
  {
    "nome": "MARCIO ELIAS DE SOUZA",
    "telefone": "553199916198@s.whatsapp.net",
    "email": "Meliasbh@gmail.com"
  },
  {
    "nome": "Wellysson de Chantal Mendes",
    "telefone": "5531984498829@s.whatsapp.net",
    "email": "Wellyssom@gmail.com"
  },
  {
    "nome": "Davi Rocha de Jesus",
    "telefone": "5531996381229@s.whatsapp.net",
    "email": "davirj281@gmail.com"
  },
  {
    "nome": "Adriano Silva",
    "telefone": "5531984306048@s.whatsapp.net",
    "email": "adianosilva17@gmail.com"
  },
  {
    "nome": "Alan Braga Gomes",
    "telefone": "5531995604669@s.whatsapp.net",
    "email": "alanbragag@hotmail.com"
  },
  {
    "nome": "Eustaquio oliveira",
    "telefone": "5531995021355@s.whatsapp.net",
    "email": "00000000000000000@gmail.com"
  },
  {
    "nome": "Kaique Otávio",
    "telefone": "553199540976@s.whatsapp.net",
    "email": "marianeca03@gmail.com"
  },
  {
    "nome": "Daniel Souza Fernandes",
    "telefone": "5531984574160@s.whatsapp.net",
    "email": "DanielSF_2004@outlook.com"
  },
  {
    "nome": "Fátima da ressureição alves",
    "telefone": "5531995624663@s.whatsapp.net",
    "email": "Fatimamoeda453@gmail.com"
  },
  {
    "nome": "Alan Carvalho",
    "telefone": "5531996216331@s.whatsapp.net",
    "email": "alancarvalho.13@hotmail.com"
  },
  {
    "nome": "Kaique Brenner",
    "telefone": "5531998923777@s.whatsapp.net",
    "email": "kaiqueantunes2004@gmail.com"
  },
  {
    "nome": "Douglas Diego",
    "telefone": "5531995049621@s.whatsapp.net",
    "email": "ddlg3433@gmail.com"
  },
  {
    "nome": "Arthur Ricardo Lopes Mendes",
    "telefone": "5531973499702@s.whatsapp.net",
    "email": "arthurlopesmendes16@icloud.com"
  },
  {
    "nome": "Fabio Henrique",
    "telefone": "5531982298785@s.whatsapp.net",
    "email": "fabio.fp2001@gmail.com"
  },
  {
    "nome": "Jorge Passos",
    "telefone": "5531998477792@s.whatsapp.net",
    "email": "jorge.passos@gmail.com"
  },
  {
    "nome": "Geraldo fernandes",
    "telefone": "5531981066397@s.whatsapp.net",
    "email": "Fernadesgeraldo891@gmail.com"
  },
  {
    "nome": "Jardel Henrique Dutra",
    "telefone": "5531998295299@s.whatsapp.net",
    "email": "jardeldutra728@gmail.com"
  },
  {
    "nome": "Julio Cesar correia",
    "telefone": "5531982285714@s.whatsapp.net",
    "email": "juliiotratorcesar@gmail.com"
  },
  {
    "nome": "Artur santana Silva",
    "telefone": "5531982317071@s.whatsapp.net",
    "email": "artursantana8787@gmail.com"
  },
  {
    "nome": "Danilo Amorim de Moura",
    "telefone": "5531982738946@s.whatsapp.net",
    "email": "danilo33mb@gmail.com"
  },
  {
    "nome": "LUCIANO RODRIGO GALDINO FELIX",
    "telefone": "5531984127504@s.whatsapp.net",
    "email": "lucianomoeda5284@gmail.com"
  },
  {
    "nome": "Vitor Hugo Batista",
    "telefone": "5535998773636@s.whatsapp.net",
    "email": "bvitorhugos@gmail.com"
  },
  {
    "nome": "Júnio Barbosa",
    "telefone": "5531984317754@s.whatsapp.net",
    "email": "juniobarbosas@gmail.com"
  },
  {
    "nome": "Junior Bertolazzo",
    "telefone": "5531995026410@s.whatsapp.net",
    "email": "jurodriguesmagia@hotmail.com"
  },
  {
    "nome": "Janan Lazo",
    "telefone": "5531982260116@s.whatsapp.net",
    "email": "janansituy@hotmail.com"
  },
  {
    "nome": "Gabriel alves Parreiras",
    "telefone": "5531973161988@s.whatsapp.net",
    "email": "bibigabrielalves3@gmail.com"
  },
  {
    "nome": "Rian James",
    "telefone": "5531982848251@s.whatsapp.net",
    "email": "rianj3728@gmail.com"
  },
  {
    "nome": "Wanderson da Silva sétimo",
    "telefone": "5531984069273@s.whatsapp.net",
    "email": "00000000@gmal.com"
  },
  {
    "nome": "Carlos junio Pereira Fonseca",
    "telefone": "5531973379732@s.whatsapp.net",
    "email": "carlosjuniopereirafonseca@gmail.com"
  },
  {
    "nome": "Leandro Luiz Rodrigues",
    "telefone": "5531997525619@s.whatsapp.net",
    "email": "leandroluizrodrigues11@gmail.com"
  },
  {
    "nome": "André Cristiano tata",
    "telefone": "553198352105@s.whatsapp.net",
    "email": "andrecristiano191@gmail.com"
  },
  {
    "nome": "Breno Pereira Rodrigues",
    "telefone": "553196195086@s.whatsapp.net",
    "email": "Brenopereirarodrigues2425@gmail.com"
  },
  {
    "nome": "JACSON JUNIO DA SILVA",
    "telefone": "5531996767656@s.whatsapp.net",
    "email": "jacsonjunio10@gmail.com"
  },
  {
    "nome": "Marlon Gonçalves de souza",
    "telefone": "5531984042883@s.whatsapp.net",
    "email": "marlongoncalves986@gmail.com"
  },
  {
    "nome": "Moacir pereira machado",
    "telefone": "5531997563418@s.whatsapp.net",
    "email": "moacircoimbramachado@gmail.com"
  },
  {
    "nome": "Weliton Santana morais dos",
    "telefone": "5531975318530@s.whatsapp.net",
    "email": "santanaweliton53@gmail.com"
  },
  {
    "nome": "João carlos Rodrigues da cruz",
    "telefone": "5531971409882@s.whatsapp.net",
    "email": "joaocarlosrodriguesdacruz79@gmail.com"
  },
  {
    "nome": "Jadson Angelino",
    "telefone": "5531984478201@s.whatsapp.net",
    "email": "Jadsonangelino@gmail.com"
  },
  {
    "nome": "THIAGO MYCHEL FELIX MOREIRA",
    "telefone": "5531982223265@s.whatsapp.net",
    "email": "thiagomychel961@gmail.com"
  },
  {
    "nome": "MATHEUS ALVES GUIMARAES",
    "telefone": "5531997658115@s.whatsapp.net",
    "email": "matheusalveslop13@gmail.com"
  },
  {
    "nome": "Pedro luiz",
    "telefone": "553189670480@s.whatsapp.net",
    "email": "pedroluizclima@gmail.com"
  },
  {
    "nome": "Marcelo Augusto",
    "telefone": "5531984196905@s.whatsapp.net",
    "email": "marceloaugustomoeda@gmail.com"
  },
  {
    "nome": "Viviane Vargas",
    "telefone": "5531991515069@s.whatsapp.net",
    "email": "vivianevargasbh@gmail.com"
  },
  {
    "nome": "Sara Alves Teodoro",
    "telefone": "5531972666906@s.whatsapp.net",
    "email": "saradiantedotrono7@gmail.com"
  },
  {
    "nome": "Pedro Cordeiro",
    "telefone": "5531982518566@s.whatsapp.net",
    "email": "pedrocordeoiro99@gmail.com"
  },
  {
    "nome": "Vinicius gabriel duarte querino",
    "telefone": "5531982117125@s.whatsapp.net",
    "email": "Vini00146@gmail.com"
  },
  {
    "nome": "Altair Agostinho Antunes Braga",
    "telefone": "5531971599404@s.whatsapp.net",
    "email": "altair.braga48@gmail.com"
  },
  {
    "nome": "CYNTHIA FAGUNDES VIEIRA",
    "telefone": "5531997833631@s.whatsapp.net",
    "email": "cfagundesmoura@yahoo.com.br"
  },
  {
    "nome": "Juliana Martins",
    "telefone": "5531995019927@s.whatsapp.net",
    "email": "julianamartinstrindade@gmail.com"
  },
  {
    "nome": "Douglas Duarte Braga",
    "telefone": "5531998836891@s.whatsapp.net",
    "email": "db758183@gmail.com"
  },
  {
    "nome": "Luiz Gustavo Cardoso Cunha",
    "telefone": "5531995542817@s.whatsapp.net",
    "email": "lg.cardoso2000@gmail.com"
  },
  {
    "nome": "João victhor Rodrigo Santos De Paula",
    "telefone": "5531994848182@s.whatsapp.net",
    "email": "joaovicthor2007711@gmail.com"
  },
  {
    "nome": "Gilsomar Rodrigues Da Cruz",
    "telefone": "5531990654841@s.whatsapp.net",
    "email": "Mar36980@gmail.com"
  },
  {
    "nome": "Cinthia Sena",
    "telefone": "5531999579545@s.whatsapp.net",
    "email": "cinthiadssena@gmail.com"
  },
  {
    "nome": "Fernando Souza",
    "telefone": "5531991757057@s.whatsapp.net",
    "email": "nando.tour@gmail.com"
  },
  {
    "nome": "Fernando de Oliveira Vitarelli",
    "telefone": "5531975179860@s.whatsapp.net",
    "email": "fernandoovitarelli@gmail.com"
  },
  {
    "nome": "João Marcelo",
    "telefone": "5531982138544@s.whatsapp.net",
    "email": "joaodatila@gmail.com"
  },
  {
    "nome": "Izael Pereira",
    "telefone": "5511951990281@s.whatsapp.net",
    "email": "Izaelsantos202@gmail.com"
  },
  {
    "nome": "Katriel Castro silva",
    "telefone": "5531995317870@s.whatsapp.net",
    "email": "Katrielcastrosilva@gmail.com"
  },
  {
    "nome": "Heraldo Braga",
    "telefone": "5531971697292@s.whatsapp.net",
    "email": "bragaheraldo10@gmail.com"
  },
  {
    "nome": "Rodrigo Teixeira Alves",
    "telefone": "5531984430372@s.whatsapp.net",
    "email": "rodrigot.alves@hotmail.com"
  },
  {
    "nome": "MARCOS AGOSTINHO DE AGUIAR CARMO",
    "telefone": "5531982290888@s.whatsapp.net",
    "email": "Marcoscarmo25@gmail.com"
  },
  {
    "nome": "Ludinei Moraes",
    "telefone": "553171495981@s.whatsapp.net",
    "email": "mludinei@gmail.com"
  },
  {
    "nome": "Kayky garrides machado",
    "telefone": "5531982560335@s.whatsapp.net",
    "email": "Kayoblackmage@Gmail.com"
  },
  {
    "nome": "rafela sales",
    "telefone": "5531995824589@s.whatsapp.net",
    "email": "rafaellamarcosdavimiguel@gmail.com"
  },
  {
    "nome": "Phillemon Augusto da Silva Sousa",
    "telefone": "5531984853568@s.whatsapp.net",
    "email": "augustophillemon@gmail.com"
  },
  {
    "nome": "Edsander Gabriel Torres de morais",
    "telefone": "5531996091033@s.whatsapp.net",
    "email": "edsandernico@gmail.com"
  },
  {
    "nome": "Gabriel Baeta",
    "telefone": "5531999736536@s.whatsapp.net",
    "email": "Gabriel@moedense.com.br"
  },
  {
    "nome": "Catriel Baquela",
    "telefone": "5531995873862@s.whatsapp.net",
    "email": "Catriel.baquela@gmail.com"
  },
  {
    "nome": "Andressa Rytchelle",
    "telefone": "5531999785902@s.whatsapp.net",
    "email": "andressaantunesmk@gmail.com"
  },
  {
    "nome": "Thiago Gaspar Ventura",
    "telefone": "5531986551756@s.whatsapp.net",
    "email": "encontrocomventura@gmail.com"
  },
  {
    "nome": "Gustavo Henrique Rodrigues Silva",
    "telefone": "5531984548367@s.whatsapp.net",
    "email": "gustavorodrigues.ccr@gmail.com"
  },
  {
    "nome": "George Soares",
    "telefone": "5531996605142@s.whatsapp.net",
    "email": "soaresgeorge438@gmail.com"
  },
  {
    "nome": "Marcio da silva juvenci",
    "telefone": "5531999545094@s.whatsapp.net",
    "email": "marciojr573@gmail.com"
  },
  {
    "nome": "Davi Dione de carvalho",
    "telefone": "5531995594367@s.whatsapp.net",
    "email": "davidione@gmail.com"
  },
  {
    "nome": "Altair Eurico",
    "telefone": "5531997748612@s.whatsapp.net",
    "email": "altaireurico12@gmail.com"
  },
  {
    "nome": "Eudes Fernandes da silva",
    "telefone": "5531992214873@s.whatsapp.net",
    "email": "eudesfernandesbetha@gmail.com"
  },
  {
    "nome": "Walisson Leandro",
    "telefone": "5531995416708@s.whatsapp.net",
    "email": "leandrowalisson71@gmail.com"
  },
  {
    "nome": "Daniel Henrique da Silva Mendes",
    "telefone": "5531990672078@s.whatsapp.net",
    "email": "danielmendes45@yahoo.com"
  },
  {
    "nome": "Guilherme Silva Corrêa",
    "telefone": "5535997577833@s.whatsapp.net",
    "email": "guilherme99301323@gmail.com"
  },
  {
    "nome": "Italo NRP",
    "telefone": "5531984475347@s.whatsapp.net",
    "email": "italoandmaria@gmail.com"
  },
  {
    "nome": "Anselmo Luis Rocha de Oliveira",
    "telefone": "5565996280046@s.whatsapp.net",
    "email": "aselmolui@gmail.com"
  },
  {
    "nome": "Grazielly Marinho Félix Souza",
    "telefone": "5531997026220@s.whatsapp.net",
    "email": "Grazielly.marinhofelix@icloud.com"
  },
  {
    "nome": "Matheus Santos",
    "telefone": "5531996951643@s.whatsapp.net",
    "email": "Santos11.matheus@hotmail.com"
  },
  {
    "nome": "Lucas Faria",
    "telefone": "5531991627373@s.whatsapp.net",
    "email": "lucas_sf@yahoo.com.br"
  },
  {
    "nome": "Helbert jose",
    "telefone": "5531995968078@s.whatsapp.net",
    "email": "helbertjose.moura@gmail.com"
  },
  {
    "nome": "Lucas Filipe Rocha das chagas",
    "telefone": "5531982376602@s.whatsapp.net",
    "email": "lucasfilipechagas@gmail.com"
  },
  {
    "nome": "Adriano henrique de queiroz",
    "telefone": "5531971663933@s.whatsapp.net",
    "email": "adrianohqueiroz19@gmail.com"
  },
  {
    "nome": "Grazielly Marinho",
    "telefone": "5531997026220@s.whatsapp.net",
    "email": "Grazielly.marinho@icloud.com"
  },
  {
    "nome": "Fábio Henrique (Guaxinim)",
    "telefone": "5531983201901@s.whatsapp.net",
    "email": "fabio15h@hotmail.com"
  },
  {
    "nome": "Ronai de Souza Armando",
    "telefone": "5531999836133@s.whatsapp.net",
    "email": "ronaisouza688@gmail.com"
  },
  {
    "nome": "Mateus Morouço Alves",
    "telefone": "5531983878245@s.whatsapp.net",
    "email": "tete-uss@hotmail.com"
  },
  {
    "nome": "Rafael Eloizio Alves da Silva",
    "telefone": "5531984936357@s.whatsapp.net",
    "email": "Rafaelsilvabbc@gmail.com"
  },
  {
    "nome": "Érica de Fátima silva",
    "telefone": "5531999535348@s.whatsapp.net",
    "email": "Cauangabriel267@gamil.com"
  },
  {
    "nome": "neidinha99@yahoo.com.br",
    "telefone": "5531994066070@s.whatsapp.net",
    "email": "neidinha99@yahoo.com.br"
  },
  {
    "nome": "Marcio nunes",
    "telefone": "5531996437763@s.whatsapp.net",
    "email": "marcionunesmoreira@yaru.com.br"
  },
  {
    "nome": "Daniel Vitor Anfelino Custodio",
    "telefone": "5531982508852@s.whatsapp.net",
    "email": "daniel.0512vitor@gmail.com"
  },
  {
    "nome": "Wanderley Ferreira",
    "telefone": "5533999508348@s.whatsapp.net",
    "email": "ferreirawanderley328@gmail.com"
  },
  {
    "nome": "Kauan",
    "telefone": "5531999535348@s.whatsapp.net",
    "email": "Kauangabriel234@gmail.com"
  },
  {
    "nome": "Gabriel Fernandes",
    "telefone": "5531991636279@s.whatsapp.net",
    "email": "gabrielsouzaferferr@gmail.com"
  },
  {
    "nome": "Izo Raphael Barreto Ferreira",
    "telefone": "5531984545020@s.whatsapp.net",
    "email": "izoraphael4@gmail.com"
  },
  {
    "nome": "Moacir Coimbra machado",
    "telefone": "5531997563418@s.whatsapp.net",
    "email": "Moacihcoimbrahmachado@gmail.com"
  },
  {
    "nome": "Letícia Mingote",
    "telefone": "5531971302564@s.whatsapp.net",
    "email": "leticiamingote@gmail.com"
  },
  {
    "nome": "cesar paulo",
    "telefone": "5531982688475@s.whatsapp.net",
    "email": "paulocesar@gmail.com"
  },
  {
    "nome": "Weverson",
    "telefone": "5531983476610@s.whatsapp.net",
    "email": "wrresgateesalvamento@gmail.com"
  },
  {
    "nome": "Tadeu de sousa",
    "telefone": "5531999995555@s.whatsapp.net",
    "email": "tadeumoeda@hotmail.com"
  },
  {
    "nome": "BRUNO E A QUEIROZ",
    "telefone": "5531971131691@s.whatsapp.net",
    "email": "brunoeduardoc20@gmail.com"
  },
  {
    "nome": "Vitorio augusto de castro",
    "telefone": "5531995348359@s.whatsapp.net",
    "email": "vitoriocastro789@gmail.com"
  },
  {
    "nome": "carina galdino",
    "telefone": "5531985159262@s.whatsapp.net",
    "email": "Kaagaldinoo12@gmail.com"
  },
  {
    "nome": "fernanda paula",
    "telefone": "5531996223403@s.whatsapp.net",
    "email": "fernandapalves15@gmail.com"
  },
  {
    "nome": "Miguel Alves da Silva",
    "telefone": "553171414270@s.whatsapp.net",
    "email": "ma9788796@gmail.com"
  },
  {
    "nome": "Lucas Pena",
    "telefone": "5531993433534@s.whatsapp.net",
    "email": "lucaspenaenf@gmail.com"
  },
  {
    "nome": "Davi Ribeiro Martins",
    "telefone": "553182675130@s.whatsapp.net",
    "email": "dr2316085@gmail.com"
  },
  {
    "nome": "Victor Hugo Santos",
    "telefone": "5531982348004@s.whatsapp.net",
    "email": "victorhuhomoeda2@gmail.com"
  },
  {
    "nome": "IZAC MARTINS DO NASCIMENTO JUNIOR",
    "telefone": "5531996042703@s.whatsapp.net",
    "email": "Izacmartins115@gmail.com"
  },
  {
    "nome": "Marcelo Cunha Barbosa",
    "telefone": "5531999556230@s.whatsapp.net",
    "email": "Barbosacunhamarcelo@hotmail.com"
  },
  {
    "nome": "João Victor da Silva Fonseca",
    "telefone": "5531984505264@s.whatsapp.net",
    "email": "joaovictorsilvafonseca5@gmail.com"
  },
  {
    "nome": "Philippe Barreto",
    "telefone": "5531983774585@s.whatsapp.net",
    "email": "carvlhobianca@gmail.com"
  },
  {
    "nome": "Carlos Bruno Vieira Coelho",
    "telefone": "5531995555975@s.whatsapp.net",
    "email": "brunobruno123rrrr@gmail.com"
  },
  {
    "nome": "luan souza",
    "telefone": "5531995693144@s.whatsapp.net",
    "email": "luansouzarmado@gmail.com"
  },
  {
    "nome": "Kaique PIRES",
    "telefone": "5531982832468@s.whatsapp.net",
    "email": "kaiquemoeda1@gmail.com"
  },
  {
    "nome": "João Pedro",
    "telefone": "5535992757875@s.whatsapp.net",
    "email": "jp063958258@gmail.com"
  },
  {
    "nome": "joao itor",
    "telefone": "5531996732886@s.whatsapp.net",
    "email": "vodadala1929@gmail.com"
  },
  {
    "nome": "Lucas Emanuel de Oliveira Aleixo",
    "telefone": "5531990710818@s.whatsapp.net",
    "email": "ldesignp03@gmail.com"
  },
  {
    "nome": "Paulo Henrique de Morais Xavier",
    "telefone": "5531983330851@s.whatsapp.net",
    "email": "phmx123@gmail.com"
  },
  {
    "nome": "Alexandre moreira do amaral",
    "telefone": "5531984841900@s.whatsapp.net",
    "email": "alexandremoreiradoamaral@gmail.com"
  },
  {
    "nome": "Jose Jaime G",
    "telefone": "5516047818178@s.whatsapp.net",
    "email": "jose.jaime.ca@gmail.com"
  },
  {
    "nome": "Wivily Braga",
    "telefone": "5531999844362@s.whatsapp.net",
    "email": "wivilybraga@gmail.com"
  },
  {
    "nome": "Joao Teodoro",
    "telefone": "5531993669580@s.whatsapp.net",
    "email": "Joaoteodoro95@gmail.com"
  },
  {
    "nome": "Marlon Aguiar",
    "telefone": "5531983088275@s.whatsapp.net",
    "email": "marlon.messias19@hotmail.com"
  },
  {
    "nome": "WIVILY RAMOS SOARES BRAGA",
    "telefone": "5531999844362@s.whatsapp.net",
    "email": "Wivilybraga@hotmail.com"
  },
  {
    "nome": "Kayky Souza",
    "telefone": "5531987970368@s.whatsapp.net",
    "email": "kaykysoares055@gmail.com"
  },
  {
    "nome": "Guilherme Victor anunciação",
    "telefone": "5531995951726@s.whatsapp.net",
    "email": "Postogeleia@gmail.com"
  },
  {
    "nome": "Rosiane Das Graças silva",
    "telefone": "5531995487993@s.whatsapp.net",
    "email": "rosianesilva2045@gmail.com"
  },
  {
    "nome": "Joao victor alves campos",
    "telefone": "5531997986618@s.whatsapp.net",
    "email": "Joao997986618@gmail.com"
  },
  {
    "nome": "Marcos Alexandre Ferreira",
    "telefone": "5531081099193@s.whatsapp.net",
    "email": "maferreira100810@gmail.com"
  },
  {
    "nome": "Roberto Nascimento de Almeida",
    "telefone": "5531984220272@s.whatsapp.net",
    "email": "robertonascimento.almeida@gmail.com"
  },
  {
    "nome": "Juliano Azevedo",
    "telefone": "5531984044284@s.whatsapp.net",
    "email": "julianoazevedosil@gmail.com"
  },
  {
    "nome": "werton valerian",
    "telefone": "553197148012@s.whatsapp.net",
    "email": "wertonvalerian@gmail.com"
  },
  {
    "nome": "ricardo vagner",
    "telefone": "5531971633212@s.whatsapp.net",
    "email": "ricardovagner@gmail.com"
  },
  {
    "nome": "Alam moreira",
    "telefone": "5531984095279@s.whatsapp.net",
    "email": "alammoreira8@gmail.com"
  },
  {
    "nome": "Emanuel Rodrigues de Melo",
    "telefone": "5531984745872@s.whatsapp.net",
    "email": "wearloking0hevere@gmail.com"
  },
  {
    "nome": "Gleiciane Carvalho",
    "telefone": "5531982284392@s.whatsapp.net",
    "email": "Gleicianemoeda@gmail.com"
  },
  {
    "nome": "FLAVIO DE ARAUJO LIMA",
    "telefone": "5531992933779@s.whatsapp.net",
    "email": "Flavioaraujo21@gmail.com"
  },
  {
    "nome": "Lucas Fernandes",
    "telefone": "5531995733331@s.whatsapp.net",
    "email": "lucas.fernandes4139@gmail.com"
  },
  {
    "nome": "João Márcio Santos Teodoro",
    "telefone": "5531973524679@s.whatsapp.net",
    "email": "geraldaluciana81@gmail.com"
  },
  {
    "nome": "Stephanie Gonçalves",
    "telefone": "5531983377515@s.whatsapp.net",
    "email": "stephanielohany@gmail.com"
  },
  {
    "nome": "João Pedro Felix Soares",
    "telefone": "5531972361094@s.whatsapp.net",
    "email": "joaopedrofelixsoares26@gmail.com"
  },
  {
    "nome": "Davi de castro uchoas",
    "telefone": "5531990902664@s.whatsapp.net",
    "email": "daviuchoas01@gmail.com"
  },
  {
    "nome": "Altamir Braga",
    "telefone": "5531971599404@s.whatsapp.net",
    "email": "altamir.braga48@gmail.com"
  },
  {
    "nome": "João Itor Honório Fernandes",
    "telefone": "5531984807310@s.whatsapp.net",
    "email": "jitor57@gmail.com"
  },
  {
    "nome": "PABLO NEY LIMA SANTOS",
    "telefone": "5531995637005@s.whatsapp.net",
    "email": "pabloney818@gmail.com"
  },
  {
    "nome": "Luiz Felipe Mendes Teodoro",
    "telefone": "5511957775002@s.whatsapp.net",
    "email": "luiz.fun96@gmail.com"
  },
  {
    "nome": "Othon Vitor Castro Braga",
    "telefone": "5531990690082@s.whatsapp.net",
    "email": "othonvitor2008@gmail.com"
  },
  {
    "nome": "Felipe silva",
    "telefone": "5535984155283@s.whatsapp.net",
    "email": "lipe.rob0804@gmail.com"
  },
  {
    "nome": "paulo cesar",
    "telefone": "5531999415052@s.whatsapp.net",
    "email": "paulocesar12@gmail.com"
  },
  {
    "nome": "Bio",
    "telefone": "553198643257@s.whatsapp.net",
    "email": "biohenrique@gmail.com"
  },
  {
    "nome": "Àlan",
    "telefone": "5531971723787@s.whatsapp.net",
    "email": "Alanradrigues@gmail.com"
  },
  {
    "nome": "CARLOS",
    "telefone": "5531971315726@s.whatsapp.net",
    "email": "CARLOS@GMAIL.COM"
  },
  {
    "nome": "lucas Alberto/ cemig",
    "telefone": "5531995092398@s.whatsapp.net",
    "email": "lucasalberto@gmail.com"
  },
  {
    "nome": "Sidnei Santos",
    "telefone": "5531995742960@s.whatsapp.net",
    "email": "amaliacristina24@gmail.com"
  },
  {
    "nome": "Antônio Marcos",
    "telefone": "5531972142802@s.whatsapp.net",
    "email": "carmobragaanthonio@gmail.com"
  },
  {
    "nome": "Anderson Aparecido Santos",
    "telefone": "5531995678197@s.whatsapp.net",
    "email": "andersonjohnsantos@gmail.com"
  },
  {
    "nome": "Pablo Gabriel Carmo Ferreira",
    "telefone": "5531995089136@s.whatsapp.net",
    "email": "pablo.gabriel.carmo.123@gmail.com"
  },
  {
    "nome": "Danilo F",
    "telefone": "5531991538588@s.whatsapp.net",
    "email": "danilofotodesign@hotmail.com"
  },
  {
    "nome": "VINICIO LEONE SOUZA OLIVEIRA",
    "telefone": "5531997355573@s.whatsapp.net",
    "email": "vinicioleone11@gmail.com"
  },
  {
    "nome": "DANILO BRAGA",
    "telefone": "5531991515069@s.whatsapp.net",
    "email": "danilobraga@gmail.com"
  },
  {
    "nome": "Jéssica/açai e lanches",
    "telefone": "5531984146349@s.whatsapp.net",
    "email": "jessica@gmail.com"
  },
  {
    "nome": "Valdir",
    "telefone": "5531998765423@s.whatsapp.net",
    "email": "valdir@gmail.com"
  },
  {
    "nome": "sem cadastro",
    "telefone": "553199999999@s.whatsapp.net",
    "email": "semcadastro@gmail.com"
  },
  {
    "nome": "Pedro",
    "telefone": "553199876535@s.whatsapp.net",
    "email": "pedro@gmail.com"
  },
  {
    "nome": "Gabriel",
    "telefone": "5531998755542@s.whatsapp.net",
    "email": "gabriel@gmail.com"
  },
  {
    "nome": "crislei",
    "telefone": "553193198621@s.whatsapp.net",
    "email": "crislei@gmail.com"
  },
  {
    "nome": "Junim capoeirão",
    "telefone": "5531975998351@s.whatsapp.net",
    "email": "junim@gmail.com"
  },
  {
    "nome": "Giovane Alves",
    "telefone": "5531971163943@s.whatsapp.net",
    "email": "giovanealves@gmail.com"
  },
  {
    "nome": "Andressa",
    "telefone": "5531999785902@s.whatsapp.net",
    "email": "andressa@gmail.com"
  },
  {
    "nome": "Romir Guerra",
    "telefone": "5531998027819@s.whatsapp.net",
    "email": "romirguerra@gmail.com"
  },
  {
    "nome": "Jeferson/Quinzeiro",
    "telefone": "5531971234578@s.whatsapp.net",
    "email": "jeferson@gmail.com"
  },
  {
    "nome": "Reginaldo Fernandes",
    "telefone": "5531982285573@s.whatsapp.net",
    "email": "fernandesreginaldo6910@gmail.com"
  },
  {
    "nome": "Isaac Felipe",
    "telefone": "5531996084112@s.whatsapp.net",
    "email": "jennyfer_gabrielle@live.com"
  },
  {
    "nome": "José Luiz Marques do Prado",
    "telefone": "5531994561038@s.whatsapp.net",
    "email": "luizpradobr@icloud.com"
  },
  {
    "nome": "Nivia Las Casas",
    "telefone": "5531984227325@s.whatsapp.net",
    "email": "nivia@gmail.com"
  },
  {
    "nome": "HIlario",
    "telefone": "5531999214679@s.whatsapp.net",
    "email": "hilario@gmail.com"
  },
  {
    "nome": "paulo padeiro",
    "telefone": "5531982688276@s.whatsapp.net",
    "email": "paulo@gmail.com"
  },
  {
    "nome": "Dirceu/Henrique",
    "telefone": "5531971155270@s.whatsapp.net",
    "email": "dirceu@gmail.com"
  },
  {
    "nome": "Miguel Silva Santos",
    "telefone": "5531997203996@s.whatsapp.net",
    "email": "miguelsilvasantos512009@gmail.com"
  },
  {
    "nome": "Miguel Samuel De Moura",
    "telefone": "5531982163864@s.whatsapp.net",
    "email": "Faltavaminutos@gmail.com"
  },
  {
    "nome": "Matheus Felipe Santos de paula",
    "telefone": "5531993707727@s.whatsapp.net",
    "email": "matheusfelipe06082011@gmail.com"
  },
  {
    "nome": "Camila Prudente",
    "telefone": "5521989294405@s.whatsapp.net",
    "email": "Camila.prudente3@gmail.com"
  },
  {
    "nome": "Tainah Pousas",
    "telefone": "5531984669119@s.whatsapp.net",
    "email": "tainpousas@gmail.com"
  },
  {
    "nome": "leonardo tadeu Lopes",
    "telefone": "5531995302170@s.whatsapp.net",
    "email": "llmlopes.lopes5@gmail.com"
  },
  {
    "nome": "Adail",
    "telefone": "553199718499@s.whatsapp.net",
    "email": "adail@gmail.com"
  },
  {
    "nome": "Vandinho Bar",
    "telefone": "553198245619@s.whatsapp.net",
    "email": "vandinho@gmail.com"
  },
  {
    "nome": "Décio",
    "telefone": "5531984151115@s.whatsapp.net",
    "email": "decio@gmail.com"
  },
  {
    "nome": "jesus batista almeida",
    "telefone": "5531984047002@s.whatsapp.net",
    "email": "jesus@gmail.com"
  },
  {
    "nome": "Maria Fahl",
    "telefone": "5531999108179@s.whatsapp.net",
    "email": "mariafahl@gmail.com"
  },
  {
    "nome": "Dileia Borges",
    "telefone": "5531995391764@s.whatsapp.net",
    "email": "dileiaborges@gmail.com"
  },
  {
    "nome": "Astrogildo Antunes",
    "telefone": "5531984010525@s.whatsapp.net",
    "email": "astrogildoantunes@gmail.com"
  },
  {
    "nome": "Phillemon",
    "telefone": "5531984853568@s.whatsapp.net",
    "email": "phsousa2104@gmail.com"
  },
  {
    "nome": "Danielle Maciel Fernandes Ferry",
    "telefone": "5531998354151@s.whatsapp.net",
    "email": "danielle.moeda@yahoo.com.br"
  },
  {
    "nome": "Fábio Maciel Ferry",
    "telefone": "5531982510871@s.whatsapp.net",
    "email": "guiaestradareal@gmail.com"
  },
  {
    "nome": "Edmar Alves do Carmo",
    "telefone": "5531984476680@s.whatsapp.net",
    "email": "edmardenizia@hotmail.com"
  },
  {
    "nome": "William lopes Rodrigues",
    "telefone": "5531996524058@s.whatsapp.net",
    "email": "williamlopesrodrigues100@gmail.com"
  },
  {
    "nome": "André Jaime Pereira Da Silva",
    "telefone": "5531997789809@s.whatsapp.net",
    "email": "as7961454@gmail.com"
  },
  {
    "nome": "Emanuel castro braga",
    "telefone": "5531999440754@s.whatsapp.net",
    "email": "emanuelzinhomoeda2022@gmail.com"
  },
  {
    "nome": "Lucas Alberto",
    "telefone": "5531995092398@s.whatsapp.net",
    "email": "lucasantos.alberto@gmail.com"
  },
  {
    "nome": "Alexandre Marcos Tavares Abreu Abreu",
    "telefone": "5531992135966@s.whatsapp.net",
    "email": "alextron.br@gmail.com"
  },
  {
    "nome": "Alefi Júnio",
    "telefone": "5531982847842@s.whatsapp.net",
    "email": "alefijunior25@gmail.com"
  },
  {
    "nome": "Davi Campanini Amorim",
    "telefone": "5531995587014@s.whatsapp.net",
    "email": "davicampanini19@gmail.com"
  },
  {
    "nome": "Breno castro Silva",
    "telefone": "5531998852138@s.whatsapp.net",
    "email": "brenocastrosilva31@gmail.com"
  },
  {
    "nome": "Welington Gonçalves Amorim",
    "telefone": "5531984751001@s.whatsapp.net",
    "email": "Welingtomamorim@hotmail.com"
  },
  {
    "nome": "Aline pessegueiro",
    "telefone": "5531984101912@s.whatsapp.net",
    "email": "aline@gmail.com"
  },
  {
    "nome": "Joel Honorio Mendes",
    "telefone": "5531999653269@s.whatsapp.net",
    "email": "mendeshonorio3112@gmail.com"
  },
  {
    "nome": "Aniele Fátima Anjos Carmo",
    "telefone": "5531971176018@s.whatsapp.net",
    "email": "anielefatima31@icloud.com"
  },
  {
    "nome": "Jessica Patrícia",
    "telefone": "5531971201590@s.whatsapp.net",
    "email": "Jessicalovedavi18@gmail.com"
  },
  {
    "nome": "VINICIUS EUGENIO SUARES",
    "telefone": "5531996051281@s.whatsapp.net",
    "email": "viniciuseugeniosuares@gmail.com"
  },
  {
    "nome": "Davi Ribeiro martins",
    "telefone": "5531997275770@s.whatsapp.net",
    "email": "laralanamartins1991@gmail.com"
  },
  {
    "nome": "Daiana Gomes",
    "telefone": "5531984012952@s.whatsapp.net",
    "email": "daianamoeda@gmail.com"
  },
  {
    "nome": "LUCAS QUIRINO FIDELES PASSOS",
    "telefone": "5531983049082@s.whatsapp.net",
    "email": "Lucasqfideles@gmail.com"
  },
  {
    "nome": "Thiago Lopes Rodrigues",
    "telefone": "553398157579@s.whatsapp.net",
    "email": "Tiagolopesrodrigues260@gmail.com"
  },
  {
    "nome": "Kayky souza soares",
    "telefone": "5531987970368@s.whatsapp.net",
    "email": "arealfox03@gmail.com"
  },
  {
    "nome": "Fernanda alves",
    "telefone": "5531982520671@s.whatsapp.net",
    "email": "nandacastroalvess@gmail.com"
  },
  {
    "nome": "Luiz Felipe",
    "telefone": "5531997536858@s.whatsapp.net",
    "email": "luizdecastro96@gmail.com"
  },
  {
    "nome": "Guilherme Augusto",
    "telefone": "5531982329850@s.whatsapp.net",
    "email": "guilhermehermenegildo12@gmail.com"
  },
  {
    "nome": "natan fontula",
    "telefone": "553199642829@s.whatsapp.net",
    "email": "natanfontula@gmail.com"
  },
  {
    "nome": "Lucimar uarlem",
    "telefone": "5531971811130@s.whatsapp.net",
    "email": "Lucimaruarlem020@yahoo.com.br"
  },
  {
    "nome": "Diego Geraldo Vieira Alves",
    "telefone": "5531982174099@s.whatsapp.net",
    "email": "diegovieiraa021@gmail.com"
  },
  {
    "nome": "ADRIANO MORAIS DA ROCHA",
    "telefone": "5531982663308@s.whatsapp.net",
    "email": "adrianomorais975@gmail.com"
  },
  {
    "nome": "Welbert Douglas da Silva Rodrigues",
    "telefone": "5531993554837@s.whatsapp.net",
    "email": "welbertdouglas30@gmail.com"
  },
  {
    "nome": "Flávio Silva Galdino",
    "telefone": "5531998858827@s.whatsapp.net",
    "email": "flaviosgaldino@hotmail.com"
  },
  {
    "nome": "Amanda Almeida",
    "telefone": "5531986736310@s.whatsapp.net",
    "email": "amandadireito21@gmail.com"
  },
  {
    "nome": "Edsander Gabriel Torres de morais",
    "telefone": "5531996091033@s.whatsapp.net",
    "email": "sandertorresdemorais@gmail.com"
  },
  {
    "nome": "Matheus Henrique Castro Braga",
    "telefone": "5533198408848@s.whatsapp.net",
    "email": "matheushenrique1508@gmail.com"
  },
  {
    "nome": "Emanuel Rodrigues de Melo",
    "telefone": "5531984745872@s.whatsapp.net",
    "email": "rodriguescruzeirense01@gmail.com"
  },
  {
    "nome": "Théo genérico Amorim da Silva",
    "telefone": "5531971448951@s.whatsapp.net",
    "email": "debinha29@yahoo.com.br"
  },
  {
    "nome": "Marcelo Martins de Castro",
    "telefone": "5531997124189@s.whatsapp.net",
    "email": "marcelocastromartins007@gmail.com"
  },
  {
    "nome": "Jade Amaral",
    "telefone": "5531996952773@s.whatsapp.net",
    "email": "roninho.jade@gmail.com"
  },
  {
    "nome": "Luiz Alberto Lebarcky Junior",
    "telefone": "5531996448102@s.whatsapp.net",
    "email": "jlebarcky@gmail.com"
  },
  {
    "nome": "Adriano santos souza",
    "telefone": "5531972155781@s.whatsapp.net",
    "email": "000000000@gma.com"
  },
  {
    "nome": "LUCAS GERALDO VIEIRA DO CARMO LAPA",
    "telefone": "5531973541200@s.whatsapp.net",
    "email": "lucaslapa15@hotmail.com"
  },
  {
    "nome": "José Eustáquio Teixeira",
    "telefone": "5531993085931@s.whatsapp.net",
    "email": "zeustaquiobh@gmail.com"
  },
  {
    "nome": "João Victor",
    "telefone": "5531982992387@s.whatsapp.net",
    "email": "joaojvgisa@gmail.com"
  },
  {
    "nome": "Yago Sanderson",
    "telefone": "5531982016980@s.whatsapp.net",
    "email": "Yagosanderson@hotmail.com"
  },
  {
    "nome": "NATALIA DE ASSIS SOUZA NEVES",
    "telefone": "5531984198734@s.whatsapp.net",
    "email": "Nat.souzaneves@gmail.com"
  },
  {
    "nome": "Yago Sanderson",
    "telefone": "5531982016980@s.whatsapp.net",
    "email": "yagosanderson544@gmail.com"
  },
  {
    "nome": "Miguel Oliveira",
    "telefone": "5531973538446@s.whatsapp.net",
    "email": "leonciomiguel558@gmail.com"
  },
  {
    "nome": "JOEL HONORIO MENDES",
    "telefone": "5531999653269@s.whatsapp.net",
    "email": "mendeshonorio18@gmail.com"
  },
  {
    "nome": "Thayron Ritchelle da Silva",
    "telefone": "5533988453798@s.whatsapp.net",
    "email": "Thayronsthifler@gmail.com"
  },
  {
    "nome": "SAMUEL BARBOSA DE ARAUJO",
    "telefone": "5512982782666@s.whatsapp.net",
    "email": "s.b.araujo1304@gmail.com"
  },
  {
    "nome": "Lucimar Uarlem",
    "telefone": "5531971811130@s.whatsapp.net",
    "email": "lucimaruarlem22@gmail.com"
  },
  {
    "nome": "Emerson Resende",
    "telefone": "5531996563767@s.whatsapp.net",
    "email": "personalclaudinei147@gmail.com"
  },
  {
    "nome": "Mateus Gabriel Silva",
    "telefone": "5531984006889@s.whatsapp.net",
    "email": "mateusgabrielsilva6@gmail.com"
  },
  {
    "nome": "Ulisses aparecido Ramos",
    "telefone": "5531997500410@s.whatsapp.net",
    "email": "ulissesramosbh@gmail.com"
  },
  {
    "nome": "Matheus Mendes Soares",
    "telefone": "5531998952102@s.whatsapp.net",
    "email": "brunaljmsoares8@gmail.com"
  },
  {
    "nome": "Flavio Santos Estocher",
    "telefone": "5531983265184@s.whatsapp.net",
    "email": "Flavio123moeda@gmail.com"
  },
  {
    "nome": "LUANA KELLY MORAIS DA ROCHA",
    "telefone": "5531971855018@s.whatsapp.net",
    "email": "moraisluana287@gmail.com"
  },
  {
    "nome": "Rafael",
    "telefone": "5531993006329@s.whatsapp.net",
    "email": "000000@gmail.com"
  },
  {
    "nome": "Sérgio da Luz Moreira",
    "telefone": "5531998965657@s.whatsapp.net",
    "email": "sergio.luzmoreira@gmail.com"
  },
  {
    "nome": "ALESSANDRO LOPES",
    "telefone": "5531983768378@s.whatsapp.net",
    "email": "lopesalessandro259@gmail.com"
  },
  {
    "nome": "Gabriel Santana",
    "telefone": "5582050755986@s.whatsapp.net",
    "email": "vandergmoura@gmail.com"
  },
  {
    "nome": "Joe Davidson Figueiredo",
    "telefone": "5531993776643@s.whatsapp.net",
    "email": "Contatojoefigieiredo@gmail.com"
  },
  {
    "nome": "Luciana",
    "telefone": "5531900000000@s.whatsapp.net",
    "email": "00000000@Gmail.Com"
  },
  {
    "nome": "Luciano Neves",
    "telefone": "5531991107357@s.whatsapp.net",
    "email": "lunespt@yahoo.com.br"
  },
  {
    "nome": "Eunice",
    "telefone": "5531900000000@s.whatsapp.net",
    "email": "0000000@gmail.com"
  },
  {
    "nome": "GABRIEL CAMPOS ARAUJO",
    "telefone": "553198956554@s.whatsapp.net",
    "email": "Gabrielcamposara@gmail.com"
  },
  {
    "nome": "Hugo",
    "telefone": "5531900000000@s.whatsapp.net",
    "email": "0000000000000@gmail.com"
  },
  {
    "nome": "Robson Fernando Mendes Teodoro",
    "telefone": "5531982291269@s.whatsapp.net",
    "email": "robsonteodoro1990@gmail.com"
  },
  {
    "nome": "Biel",
    "telefone": "5531999999999@s.whatsapp.net",
    "email": "00000000000@gmail.com"
  },
  {
    "nome": "Viviane correia",
    "telefone": "5531984328810@s.whatsapp.net",
    "email": "vivicorreia.rv@gmail.com"
  },
  {
    "nome": "Ronaldo Silva Ferreira",
    "telefone": "5531997598132@s.whatsapp.net",
    "email": "moreiraelza740@gmail.com"
  },
  {
    "nome": "Fernanda Roberta Rodrigues",
    "telefone": "5531984897475@s.whatsapp.net",
    "email": "nandabetinha0301@gmail.com"
  },
  {
    "nome": "Welfe Vitor untaller Souza",
    "telefone": "5531997026220@s.whatsapp.net",
    "email": "Welfe.vitoruntaller@icloud.com"
  },
  {
    "nome": "rubens",
    "telefone": "5517981621967@s.whatsapp.net",
    "email": "000000000@gmail.com"
  },
  {
    "nome": "Roger Eduardo Rodrigues Silva",
    "telefone": "5531972105072@s.whatsapp.net",
    "email": "kurama1999@gmail.com"
  },
  {
    "nome": "kelly",
    "telefone": "5531999999999@s.whatsapp.net",
    "email": "09999999999@gmail.com"
  },
  {
    "nome": "Fabiola Aparecida Ferreira",
    "telefone": "5531983863910@s.whatsapp.net",
    "email": "Fabiolaaparecida896@gmail.com"
  },
  {
    "nome": "Lavinia Eduarda",
    "telefone": "5531971679106@s.whatsapp.net",
    "email": "laviniaedupsantos57@gmail.com"
  },
  {
    "nome": "Daniele Soglia",
    "telefone": "5531984116620@s.whatsapp.net",
    "email": "danielesoglia2084@gmail.com"
  },
  {
    "nome": "Diogo gustavo",
    "telefone": "5531984492933@s.whatsapp.net",
    "email": "1010101000@gmail.com"
  },
  {
    "nome": "Lucas Emanuel de Oliveira Aleixo",
    "telefone": "5531984275318@s.whatsapp.net",
    "email": "Gabicmaximo@gmail.com"
  },
  {
    "nome": "GABRIEL COSTA SANTANA",
    "telefone": "5531984525806@s.whatsapp.net",
    "email": "gabrielcostasantana@gmail.com"
  },
  {
    "nome": "Wesley De Souza",
    "telefone": "5531983414057@s.whatsapp.net",
    "email": "Wesleysouza072006@gmail.com"
  },
  {
    "nome": "Otávio Rafael de Jesus Coutinho",
    "telefone": "5531983050471@s.whatsapp.net",
    "email": "otaviorafael773@gmail.com"
  },
  {
    "nome": "Eduardo Nascimento dos Santos",
    "telefone": "5531992119165@s.whatsapp.net",
    "email": "edus1632@gmail.com"
  },
  {
    "nome": "Wesley Rodrigues Dias",
    "telefone": "5531971134193@s.whatsapp.net",
    "email": "barbeiromv@gmail.com"
  },
  {
    "nome": "FABIO MACIEL FERRY",
    "telefone": "331982497399@s.whatsapp.net",
    "email": "Guiadaserra@live.com"
  },
  {
    "nome": "Geraldo",
    "telefone": "5531999999999@s.whatsapp.net",
    "email": "00000000f@gmail.com"
  },
  {
    "nome": "Pedro",
    "telefone": "5531234589045@s.whatsapp.net",
    "email": "123456789@gmail.com"
  },
  {
    "nome": "Sofia Rebeca",
    "telefone": "5531921212111@s.whatsapp.net",
    "email": "000000000009@gmail.com"
  },
  {
    "nome": "Randerll carvalho",
    "telefone": "5531984754920@s.whatsapp.net",
    "email": "000000123466@gmail.com"
  },
  {
    "nome": "Flavio",
    "telefone": "5531992933779@s.whatsapp.net",
    "email": "848484884@gmail.com"
  },
  {
    "nome": "ROMARIO XAVIER DE LIMA",
    "telefone": "5537999366548@s.whatsapp.net",
    "email": "romario4048@gmail.com"
  },
  {
    "nome": "Cauã Vinícius Martins Pereira",
    "telefone": "553195714762@s.whatsapp.net",
    "email": "cauav5400@gmail.com"
  },
  {
    "nome": "Thiago guimarães",
    "telefone": "5531995801218@s.whatsapp.net",
    "email": "1234566@gmail.com"
  },
  {
    "nome": "Cesar de Paulo Nunes Moreira",
    "telefone": "5531972038787@s.whatsapp.net",
    "email": "cesardepaulonunesmoreira99313@gmail.com"
  },
  {
    "nome": "Anderson Fernandes dos Santos",
    "telefone": "5531973066172@s.whatsapp.net",
    "email": "afs951804@gmail.com"
  },
  {
    "nome": "Patricia Nobre",
    "telefone": "5531982574064@s.whatsapp.net",
    "email": "patricianobre2023@gmail.com"
  },
  {
    "nome": "Nivia cely Las-Casas",
    "telefone": "5531984227325@s.whatsapp.net",
    "email": "niveacely@yahoo.com.br"
  },
  {
    "nome": "Rafaella",
    "telefone": "5531975566677@s.whatsapp.net",
    "email": "88888877@gmail.com"
  },
  {
    "nome": "Daniel Souza",
    "telefone": "5531984574160@s.whatsapp.net",
    "email": "catiaro.az@gmail.com"
  },
  {
    "nome": "Bruna Luciana de Jesus Mendes Soares",
    "telefone": "5531998952102@s.whatsapp.net",
    "email": "brunaljmsoares@gmail.com"
  },
  {
    "nome": "Maxwell Godoi",
    "telefone": "5531993053038@s.whatsapp.net",
    "email": "maxgodoicoach@gmail.com"
  },
  {
    "nome": "Gustavo Tomé",
    "telefone": "5531999434739@s.whatsapp.net",
    "email": "gusttavotome@gmail.com"
  },
  {
    "nome": "Antonio Cristovao dos Santos",
    "telefone": "5561982767333@s.whatsapp.net",
    "email": "cristovao.df@gmail.com"
  },
  {
    "nome": "Bruno Arthur dos santos",
    "telefone": "5531997351951@s.whatsapp.net",
    "email": "brunao0709@gmail.com"
  },
  {
    "nome": "Carlos Daniel luz dos Santos Cardoso",
    "telefone": "5531997911744@s.whatsapp.net",
    "email": "carlinhosdaniel997@gmail.com"
  },
  {
    "nome": "bruuno",
    "telefone": "5531997351951@s.whatsapp.net",
    "email": "000000000000000000000088@gmail.com"
  },
  {
    "nome": "Dionathan Marques Braga",
    "telefone": "5531995604316@s.whatsapp.net",
    "email": "Dionathanmarquesbraga1@gmail.com"
  },
  {
    "nome": "Diego Martins",
    "telefone": "5531971053365@s.whatsapp.net",
    "email": "00000000000009@gmail.com"
  },
  {
    "nome": "Nayara atendimento quinzeiro",
    "telefone": "5531972539979@s.whatsapp.net",
    "email": "hdjwhejrirjeie@gmail.com"
  },
  {
    "nome": "Rodrigo Gomes",
    "telefone": "5531984700848@s.whatsapp.net",
    "email": "98777876797t797767@gmail.com"
  },
  {
    "nome": "lucas felipe",
    "telefone": "5531982306021@s.whatsapp.net",
    "email": "lucas21@gmail.com"
  },
  {
    "nome": "Max miller",
    "telefone": "5531997206045@s.whatsapp.net",
    "email": "millerprado14@gmail.com"
  },
  {
    "nome": "FELIPE CAMPOS MUZZI",
    "telefone": "5531999490309@s.whatsapp.net",
    "email": "nairamuzzi@gmail.com"
  },
  {
    "nome": "Jose vicente",
    "telefone": "5531971674883@s.whatsapp.net",
    "email": "12345678910@gmail.com"
  },
  {
    "nome": "Fabio",
    "telefone": "5531997042246@s.whatsapp.net",
    "email": "823456789@gmail.com"
  },
  {
    "nome": "Edson",
    "telefone": "5531995000392@s.whatsapp.net",
    "email": "12456789064@gmail.com"
  },
  {
    "nome": "Gabriel richard",
    "telefone": "5537999039184@s.whatsapp.net",
    "email": "23747374773@gmail.com"
  },
  {
    "nome": "Cezar",
    "telefone": "5531999415052@s.whatsapp.net",
    "email": "34567329@gmail.com"
  },
  {
    "nome": "LUIS CARLOS VIANA DE MELO FILHO",
    "telefone": "5511985886629@s.whatsapp.net",
    "email": "luis_carlosvmf@hotmail.com"
  },
  {
    "nome": "Valmir sousa mendes",
    "telefone": "5533998591847@s.whatsapp.net",
    "email": "vv304006@gmail.com"
  },
  {
    "nome": "Anatael",
    "telefone": "5531964646646@s.whatsapp.net",
    "email": "12345678982@gmail.com"
  },
  {
    "nome": "Sebastião",
    "telefone": "5531984958325@s.whatsapp.net",
    "email": "42365635265@gmail.com"
  },
  {
    "nome": "Cezar de Paulo",
    "telefone": "5531972038787@s.whatsapp.net",
    "email": "121671671@gmail.com"
  },
  {
    "nome": "Rafael lucas",
    "telefone": "5531971056777@s.whatsapp.net",
    "email": "ftwfdhgvdg@gmail.com"
  },
  {
    "nome": "Eduardo Ortige Doxa Santos",
    "telefone": "5531984390686@s.whatsapp.net",
    "email": "tatiane.santos@stellantis.com"
  },
  {
    "nome": "Ryan Soares",
    "telefone": "5531971414434@s.whatsapp.net",
    "email": "16376351365@gmail.com"
  },
  {
    "nome": "Elerson",
    "telefone": "5531993372760@s.whatsapp.net",
    "email": "123456789987@gmail.com"
  },
  {
    "nome": "Edmar",
    "telefone": "5531989137284@s.whatsapp.net",
    "email": "141545317@gmail.com"
  },
  {
    "nome": "Barbara Ferreira Rodrigues",
    "telefone": "5531996390758@s.whatsapp.net",
    "email": "barbaraferreirar03@gmail.com"
  },
  {
    "nome": "David Almeida Azevedo",
    "telefone": "5531983596992@s.whatsapp.net",
    "email": "davidalmeidaazevedo@hotmail.com"
  },
  {
    "nome": "Tauany Brenda dos Santos",
    "telefone": "5531971098244@s.whatsapp.net",
    "email": "tauanybrenda09@gmail.com"
  },
  {
    "nome": "Ana luiza",
    "telefone": "5531996519917@s.whatsapp.net",
    "email": "jdjejeisbdjdbdd@gmail.com"
  },
  {
    "nome": "Romel",
    "telefone": "5531971056888@s.whatsapp.net",
    "email": "134567890-@gmail.com"
  },
  {
    "nome": "Antonio",
    "telefone": "5531991552642@s.whatsapp.net",
    "email": "25361543756568@gmail.com"
  },
  {
    "nome": "JÚLIO CÉZAR DE FREITAS",
    "telefone": "5531998862422@s.whatsapp.net",
    "email": "jcfreitasmoeda@gmail.com"
  },
  {
    "nome": "Cintia de Morais Rocha",
    "telefone": "5531995785632@s.whatsapp.net",
    "email": "moraiscintia987@gmail.com"
  },
  {
    "nome": "ALVARO Stevan",
    "telefone": "5531971788076@s.whatsapp.net",
    "email": "121231313@gmail.com"
  },
  {
    "nome": "Ezequiel",
    "telefone": "5531991391939@s.whatsapp.net",
    "email": "213313y1y313t13@gmail.com"
  },
  {
    "nome": "Vitor Antonio",
    "telefone": "5531991277240@s.whatsapp.net",
    "email": "jririririrjje@gmail.com"
  },
  {
    "nome": "Lucas de Souza Resende",
    "telefone": "5531993729937@s.whatsapp.net",
    "email": "Lucassouzaresende@gmail.com"
  },
  {
    "nome": "Luiz Eduardo Santos Braga",
    "telefone": "5531972244759@s.whatsapp.net",
    "email": "lueduardo386@gmail.com"
  },
  {
    "nome": "Fabiana Ferreira",
    "telefone": "5531998320734@s.whatsapp.net",
    "email": "fabianaferreirajd@gmail.com"
  },
  {
    "nome": "Bruno Leonardo",
    "telefone": "5531932717267@s.whatsapp.net",
    "email": "ghjdfgyuqydhafgyewfgewq@gmail.com"
  },
  {
    "nome": "Ana Júlia",
    "telefone": "5531997340711@s.whatsapp.net",
    "email": "annajjulia010@gmail.com"
  },
  {
    "nome": "Eder",
    "telefone": "5531991407369@s.whatsapp.net",
    "email": "1142142614361@gmail.com"
  },
  {
    "nome": "Miguel Ribeiro Martins",
    "telefone": "5531995072631@s.whatsapp.net",
    "email": "ribeiromartinsmiguel2110@gmail.com"
  },
  {
    "nome": "Breno Ramos",
    "telefone": "5531996665909@s.whatsapp.net",
    "email": "13232143@gmail.com"
  },
  {
    "nome": "daminhão",
    "telefone": "5531999991507@s.whatsapp.net",
    "email": "dsafdsdasdadssadda@gmail.com"
  },
  {
    "nome": "Miguel Augusto Braga e Carmo",
    "telefone": "5531971247228@s.whatsapp.net",
    "email": "miguelabcarmo19@gmail.com"
  },
  {
    "nome": "Isack",
    "telefone": "5531997230011@s.whatsapp.net",
    "email": "41232131@gmail.com"
  },
  {
    "nome": "Benjamin",
    "telefone": "5531971614558@s.whatsapp.net",
    "email": "1725412354@gmail.com"
  },
  {
    "nome": "Felicíssimo Marques",
    "telefone": "5531997646792@s.whatsapp.net",
    "email": "felicissimo.marques@yahoo.com.br"
  },
  {
    "nome": "Pedro",
    "telefone": "5531971056888@s.whatsapp.net",
    "email": "1212121122121@gmail.com"
  },
  {
    "nome": "nacimento",
    "telefone": "5531998943265@s.whatsapp.net",
    "email": "nascimento@gmail.com"
  },
  {
    "nome": "Igor Gabriel Ferreira cordeiro",
    "telefone": "5539989575741@s.whatsapp.net",
    "email": "igorgabrielferreiracordeiro13@gmail.com"
  },
  {
    "nome": "Luiz Eduardo",
    "telefone": "5531995003066@s.whatsapp.net",
    "email": "luizeduardoom1@gmail.com"
  },
  {
    "nome": "Tiago Silva castro",
    "telefone": "5531992675207@s.whatsapp.net",
    "email": "tiagosilvacastro.silva@yahoo.com"
  },
  {
    "nome": "Luis Fernando Santana Fernandes de Jesus",
    "telefone": "5531998170712@s.whatsapp.net",
    "email": "luisfernandosantana083@gmail.com"
  },
  {
    "nome": "Nayara rodriguez",
    "telefone": "5531952767672@s.whatsapp.net",
    "email": "24344431@gmail.com"
  },
  {
    "nome": "Isabelly",
    "telefone": "5531984064299@s.whatsapp.net",
    "email": "isabellycarvalho666@gmail.com"
  },
  {
    "nome": "João Paulo",
    "telefone": "5531997029841@s.whatsapp.net",
    "email": "ericafernandacds23@gmail.com"
  },
  {
    "nome": "Leonardo guilherme",
    "telefone": "5531981052773@s.whatsapp.net",
    "email": "1323123213131@gmail.com"
  },
  {
    "nome": "Ryan Antunes",
    "telefone": "5531999655231@s.whatsapp.net",
    "email": "ryanantunes2005@gmail.com"
  },
  {
    "nome": "Randell Albuquerque",
    "telefone": "5531997135369@s.whatsapp.net",
    "email": "randellcarvalho@yahoo.com.br"
  },
  {
    "nome": "Jhuly",
    "telefone": "5531984171144@s.whatsapp.net",
    "email": "jhuly@gmail.com"
  },
  {
    "nome": "VINICIUS PIMENTA SOARES",
    "telefone": "5528999635004@s.whatsapp.net",
    "email": "1710691@sempre.faculdadeamerica.edu.br"
  },
  {
    "nome": "Felipe Rocha",
    "telefone": "5531984268107@s.whatsapp.net",
    "email": "gustavo.felipe63@gmail.com"
  },
  {
    "nome": "Matheus Felipe Martins Santos",
    "telefone": "5531998710792@s.whatsapp.net",
    "email": "matheusmartinsfelipe@gmail.com"
  },
  {
    "nome": "Elessandra",
    "telefone": "5531995149677@s.whatsapp.net",
    "email": "1321313131@gmail.com"
  },
  {
    "nome": "Nathan Fontoura",
    "telefone": "5531999642829@s.whatsapp.net",
    "email": "2323523325532@gmail.com"
  },
  {
    "nome": "Diego da Silva",
    "telefone": "5531999095936@s.whatsapp.net",
    "email": "diegoviniciusbs@gmail.com"
  },
  {
    "nome": "Flavio Santos",
    "telefone": "5531983265184@s.whatsapp.net",
    "email": "flavioplayer7@gmail.com"
  },
  {
    "nome": "Ramon",
    "telefone": "5531929493272@s.whatsapp.net",
    "email": "542854462374@gmail.com"
  },
  {
    "nome": "Anthony",
    "telefone": "5531995932537@s.whatsapp.net",
    "email": "3131313131313@gmail.com"
  },
  {
    "nome": "Gustavo",
    "telefone": "5531983311219@s.whatsapp.net",
    "email": "5354546586@gmail.com"
  },
  {
    "nome": "Maxwell Godoi",
    "telefone": "5531998988266@s.whatsapp.net",
    "email": "maxwellgm2805@gmail.com"
  },
  {
    "nome": "merces carvalho",
    "telefone": "5531995425592@s.whatsapp.net",
    "email": "mercesmoeda@gmail.com"
  },
  {
    "nome": "Jeferson",
    "telefone": "5531972537382@s.whatsapp.net",
    "email": "5454554546@gmail.com"
  },
  {
    "nome": "Jennyfer Gabrielle",
    "telefone": "5531996084112@s.whatsapp.net",
    "email": "gabriellejennyfer4@gmail.com"
  },
  {
    "nome": "Ágatha Ferreira",
    "telefone": "5531998897159@s.whatsapp.net",
    "email": "agathaferreira8787@gmail.com"
  },
  {
    "nome": "Igor Lúcio Alves",
    "telefone": "5531984331672@s.whatsapp.net",
    "email": "igorlucio17@gmail.com"
  },
  {
    "nome": "Jonathan ribeiro Gonçalves",
    "telefone": "5531982793427@s.whatsapp.net",
    "email": "jr9639499@gmail.com"
  },
  {
    "nome": "Carlos Daniel",
    "telefone": "5531997911744@s.whatsapp.net",
    "email": "carlossamtos530@gmail.com"
  },
  {
    "nome": "Aline Alves",
    "telefone": "5531926371273@s.whatsapp.net",
    "email": "145816541e6@gmail.com"
  },
  {
    "nome": "José Lamartine",
    "telefone": "5531982794670@s.whatsapp.net",
    "email": "josehenriquealamartine@gmail.com"
  },
  {
    "nome": "Jose vicente",
    "telefone": "5531971674883@s.whatsapp.net",
    "email": "r836864734634@gmail.com"
  },
  {
    "nome": "Elen Cristina",
    "telefone": "5531994398400@s.whatsapp.net",
    "email": "elemmorim@gmail.com"
  },
  {
    "nome": "Magno Rodrigues",
    "telefone": "5531995666482@s.whatsapp.net",
    "email": "magnonevesrodrigues01@gmail.com"
  },
  {
    "nome": "Viviane Cris",
    "telefone": "5531983443522@s.whatsapp.net",
    "email": "25247625447@gmail.com"
  },
  {
    "nome": "Luiz Henrique",
    "telefone": "5531982520671@s.whatsapp.net",
    "email": "12345678@gmail.com"
  },
  {
    "nome": "Cintia Rocha",
    "telefone": "5531995785632@s.whatsapp.net",
    "email": "cintiarocha3756@gmail.com"
  },
  {
    "nome": "Breno castro silva",
    "telefone": "5531998852138@s.whatsapp.net",
    "email": "brenocastrosilva510@gmil.com"
  },
  {
    "nome": "Gabrielly Marinho Félix de Souza",
    "telefone": "5531972611063@s.whatsapp.net",
    "email": "gabriellyfelix098@gmail.com"
  },
  {
    "nome": "Nayara rodrigues Rodrigues",
    "telefone": "5531996168962@s.whatsapp.net",
    "email": "nayararodrigues.2442@gmail.com"
  },
  {
    "nome": "RUAN PABLO FELIX DE SA",
    "telefone": "5531971056888@s.whatsapp.net",
    "email": "ruanxqz8@gmail.com"
  },
  {
    "nome": "Thiago Ribeiro Campos",
    "telefone": "5531999709787@s.whatsapp.net",
    "email": "t6752121@gmail.com"
  },
  {
    "nome": "Carlos Daniel",
    "telefone": "5531997911744@s.whatsapp.net",
    "email": "coltinhogabriel6@gmail.com"
  },
  {
    "nome": "Breno",
    "telefone": "5531998852138@s.whatsapp.net",
    "email": "47173176@gmail.com"
  },
  {
    "nome": "Marcelo",
    "telefone": "5531997618136@s.whatsapp.net",
    "email": "23322332@gmail.com"
  },
  {
    "nome": "Geraldo Vieira",
    "telefone": "5531982419081@s.whatsapp.net",
    "email": "geraldovieram8@gmail.com"
  },
  {
    "nome": "Gustavo tome",
    "telefone": "5531999434739@s.whatsapp.net",
    "email": "gtimports222@gmail.com"
  },
  {
    "nome": "Luciana silva Carmo",
    "telefone": "5531983485616@s.whatsapp.net",
    "email": "lucianasilvacarmo30@gmail.com"
  },
  {
    "nome": "Regina Alves do carmo",
    "telefone": "5531971538935@s.whatsapp.net",
    "email": "reginaalves571@gmail.com"
  },
  {
    "nome": "Miguel Samuel de moura",
    "telefone": "5531982163864@s.whatsapp.net",
    "email": "quelsamuel@gmail.com"
  },
  {
    "nome": "Patrick Silva Ferreira",
    "telefone": "5531971659537@s.whatsapp.net",
    "email": "ferreirapatrick804@gmail.com"
  },
  {
    "nome": "Adriano Lopes dos Santos",
    "telefone": "5533998498514@s.whatsapp.net",
    "email": "Adrianolopes6622@gmail.com"
  },
  {
    "nome": "BRUNO FRANCA LEITE",
    "telefone": "5538991253577@s.whatsapp.net",
    "email": "Francabruno877@gmail.com"
  },
  {
    "nome": "Debora Alice",
    "telefone": "5531971448951@s.whatsapp.net",
    "email": "542554353543@gmail.com"
  },
  {
    "nome": "Lucineia Alves",
    "telefone": "5531999030439@s.whatsapp.net",
    "email": "lualvesgon96@gmail.com"
  },
  {
    "nome": "Vinícius Gomes",
    "telefone": "5531990645139@s.whatsapp.net",
    "email": "vg1812064@gmail.com"
  },
  {
    "nome": "Gleison Moura",
    "telefone": "5531975416752@s.whatsapp.net",
    "email": "gm2009507@gmail.com"
  },
  {
    "nome": "William Fonseca",
    "telefone": "5531996320299@s.whatsapp.net",
    "email": "wiliam2014xx@gmail.com"
  },
  {
    "nome": "Maurício Yoshida",
    "telefone": "5516982000788@s.whatsapp.net",
    "email": "maunyjp@gmail.com"
  },
  {
    "nome": "Luis Fernando",
    "telefone": "5531998170712@s.whatsapp.net",
    "email": "luisfernandosantana082@gmail.com"
  },
  {
    "nome": "Adriano Anastacio",
    "telefone": "5531998094827@s.whatsapp.net",
    "email": "adrianomoeda2019@gmail.com"
  },
  {
    "nome": "Luiz Fernando Carmo braga",
    "telefone": "5531998401996@s.whatsapp.net",
    "email": "carmobragaluizfernando235@gmail.com"
  },
  {
    "nome": "PABLO LUIZ DO CARMO",
    "telefone": "5531984143965@s.whatsapp.net",
    "email": "paabloluiizz@gmail.com"
  },
  {
    "nome": "Vitoria Gabriela",
    "telefone": "5531996907810@s.whatsapp.net",
    "email": "Vitoriagabrielamoeda10@gmail.com"
  },
  {
    "nome": "Lili",
    "telefone": "5531987273633@s.whatsapp.net",
    "email": "265546451261@gmail.com"
  },
  {
    "nome": "Cristian Anstacio",
    "telefone": "5531998062876@s.whatsapp.net",
    "email": "cristianzamai3@gmail.com"
  },
  {
    "nome": "Nathan Fontoura",
    "telefone": "5531999642829@s.whatsapp.net",
    "email": "nathan_fontoura@hotmail.com"
  },
  {
    "nome": "Eduardo",
    "telefone": "5531998828986@s.whatsapp.net",
    "email": "132131232@gmail.com"
  },
  {
    "nome": "RODRIGO AUGUSTO DO CARMO CARVALHO GOMES",
    "telefone": "5531983096508@s.whatsapp.net",
    "email": "Rg8216103@gmail.com"
  },
  {
    "nome": "Júlia Silva",
    "telefone": "5531999530495@s.whatsapp.net",
    "email": "jusilva2326@gmail.com"
  },
  {
    "nome": "Thiago",
    "telefone": "5531999709787@s.whatsapp.net",
    "email": "43423u42343@gmail.com"
  },
  {
    "nome": "Kauann",
    "telefone": "5531997429367@s.whatsapp.net",
    "email": "erqdsdq@gmail.com"
  },
  {
    "nome": "Jonas Antônio",
    "telefone": "5531975319314@s.whatsapp.net",
    "email": "jonasantonio23.e@gmail.com"
  },
  {
    "nome": "Magno De Paula",
    "telefone": "5531984285220@s.whatsapp.net",
    "email": "natielecoutinho310@gmail.com"
  },
  {
    "nome": "Leonardo Guilherme Lima",
    "telefone": "5531981052773@s.whatsapp.net",
    "email": "limaleog@gmail.com"
  },
  {
    "nome": "Fellipe Fischer de Oliveira Del Carlo",
    "telefone": "5531987022739@s.whatsapp.net",
    "email": "Fellipedelcarlo@gmail.com"
  },
  {
    "nome": "CARLOS GOMES RODRIGUES",
    "telefone": "5533999925356@s.whatsapp.net",
    "email": "Carllosrodrigues17@hotmail.com"
  },
  {
    "nome": "Marcos Daniel Felix",
    "telefone": "5531984656972@s.whatsapp.net",
    "email": "1223435546@gmail.com"
  },
  {
    "nome": "João Carlos",
    "telefone": "5531982504668@s.whatsapp.net",
    "email": "joaocarlosjunior9523@gmail.com"
  },
  {
    "nome": "Vinicius Gomes",
    "telefone": "5531990645139@s.whatsapp.net",
    "email": "viniciusgoomes004@gmail.com"
  },
  {
    "nome": "Sérgio Moreira Derramado",
    "telefone": "5531999833956@s.whatsapp.net",
    "email": "derramadosergiomoreira@gmail.com"
  },
  {
    "nome": "Isabelly Vitória Amorim figueredo",
    "telefone": "5531983004105@s.whatsapp.net",
    "email": "isabellyvitoriaaf@gmail.com"
  },
  {
    "nome": "Eduardo Duarte",
    "telefone": "5531997306660@s.whatsapp.net",
    "email": "eduardodus03@gmail.com"
  },
  {
    "nome": "Phillipe Fagundes",
    "telefone": "5531998490568@s.whatsapp.net",
    "email": "phillipefagundesm@gmail.com"
  },
  {
    "nome": "Thiago klik",
    "telefone": "5573999971084@s.whatsapp.net",
    "email": "Mineiroartesarraial@gmail.com"
  },
  {
    "nome": "Luciano Neves de Sousa",
    "telefone": "5531991107357@s.whatsapp.net",
    "email": "lunespt@gmail.com"
  },
  {
    "nome": "Welerson Braga",
    "telefone": "5531993456683@s.whatsapp.net",
    "email": "welerson.braga@sidrasul.com.br"
  },
  {
    "nome": "Leonardo Chquiloff",
    "telefone": "5531998116332@s.whatsapp.net",
    "email": "cmtechquiloff@gmail.com"
  },
  {
    "nome": "Diogo Martins",
    "telefone": "5531971053365@s.whatsapp.net",
    "email": "45643546546546@gmail.com"
  },
  {
    "nome": "Rafaela Quirino",
    "telefone": "5531982489144@s.whatsapp.net",
    "email": "rafaquirino01@icloud.com"
  },
  {
    "nome": "Marcelo Rodrigues",
    "telefone": "5531984715390@s.whatsapp.net",
    "email": "marceloabr2012@gmail.com"
  },
  {
    "nome": "Max campos",
    "telefone": "5531971421859@s.whatsapp.net",
    "email": "Maxjonatacampos@hotmail.com"
  },
  {
    "nome": "Bruno Eduardo",
    "telefone": "5531971231691@s.whatsapp.net",
    "email": "brunoeduardoaq@gmail.com"
  },
  {
    "nome": "Marcelo Martins de Castro",
    "telefone": "5531971076588@s.whatsapp.net",
    "email": "87524657w46572456283@gmail.com"
  },
  {
    "nome": "Bruce jhony Silva drumond",
    "telefone": "5531996239800@s.whatsapp.net",
    "email": "Brucelindo147@gmail.com"
  },
  {
    "nome": "Janan Lazo Oficial",
    "telefone": "5531982260116@s.whatsapp.net",
    "email": "janansituy77@gmail.com"
  },
  {
    "nome": "Marcio Elias de Souza",
    "telefone": "5531991619854@s.whatsapp.net",
    "email": "meliasbh.atual@gmail.com"
  },
  {
    "nome": "Alexandre",
    "telefone": "5531963737373@s.whatsapp.net",
    "email": "747484838@gmail.com"
  },
  {
    "nome": "Gabriel",
    "telefone": "5531982239927@s.whatsapp.net",
    "email": "wq3480324823949@gmail.com"
  },
  {
    "nome": "Alonso Sá",
    "telefone": "5531991235074@s.whatsapp.net",
    "email": "5454654654654@gmail.com"
  },
  {
    "nome": "Leonardo",
    "telefone": "5531992654000@s.whatsapp.net",
    "email": "t54547@gmail.com"
  },
  {
    "nome": "Hugo Leonardo",
    "telefone": "5531997892288@s.whatsapp.net",
    "email": "hugolrf@gmail.com"
  },
  {
    "nome": "Andre Ferreira",
    "telefone": "5531986957446@s.whatsapp.net",
    "email": "andre.lop1@yahoo.com.br"
  },
  {
    "nome": "DIRCEU FERNANDES MENDES",
    "telefone": "5531971155270@s.whatsapp.net",
    "email": "dirfernandes33@gmail.com"
  },
  {
    "nome": "Wesley Vinicius",
    "telefone": "5531997287823@s.whatsapp.net",
    "email": "43433443@gmail.com"
  },
  {
    "nome": "Rodrigo Alves",
    "telefone": "5531984430372@s.whatsapp.net",
    "email": "kalrokal57@gmail.com"
  },
  {
    "nome": "Lara Martins",
    "telefone": "5531997275770@s.whatsapp.net",
    "email": "laraizac1522@gmail.com"
  },
  {
    "nome": "Luiz Henrique silveira alves",
    "telefone": "5531986212372@s.whatsapp.net",
    "email": "luizsilveiraalves21@hotmail.com"
  },
  {
    "nome": "CARLOS DANIEL LUZ DOS SANTOS CARDOSO",
    "telefone": "5531997911744@s.whatsapp.net",
    "email": "lucieneluzdossantos134@gmail.com"
  },
  {
    "nome": "Geysa Macedo",
    "telefone": "5592981650241@s.whatsapp.net",
    "email": "geysa.luana_@hotmail.com"
  },
  {
    "nome": "Jeferson/Antonio",
    "telefone": "5531997169617@s.whatsapp.net",
    "email": "23121212121@gmaill.com"
  },
  {
    "nome": "Paulo Cesar",
    "telefone": "5531999060934@s.whatsapp.net",
    "email": "cesarpauloo437@gmail.com"
  },
  {
    "nome": "Paulocesar de Castro Moreira",
    "telefone": "5531990609343@s.whatsapp.net",
    "email": "Paulocesar66c@gmail.com"
  },
  {
    "nome": "Cleo silva",
    "telefone": "5531997207496@s.whatsapp.net",
    "email": "Juansinho144@gmail.com"
  },
  {
    "nome": "Gabriel campos",
    "telefone": "5531998956554@s.whatsapp.net",
    "email": "Gabrielcamposaraujo132@gmail.com"
  },
  {
    "nome": "Kauã Lopes",
    "telefone": "5538997429367@s.whatsapp.net",
    "email": "conttageral@gmail.com"
  },
  {
    "nome": "Mateus Morouço alves",
    "telefone": "5531983878245@s.whatsapp.net",
    "email": "tete-uss@gmail.com"
  },
  {
    "nome": "raphael",
    "telefone": "5531988557724@s.whatsapp.net",
    "email": "2121121@gmail.com"
  },
  {
    "nome": "Flavio Araujo",
    "telefone": "5531992933779@s.whatsapp.net",
    "email": "limaflavio74@yahoo.com"
  },
  {
    "nome": "Emanuel Amorim Braz",
    "telefone": "5531995018660@s.whatsapp.net",
    "email": "giamorim78@gmail.com"
  },
  {
    "nome": "Gabriel Lucas",
    "telefone": "5531995810717@s.whatsapp.net",
    "email": "gl5731520@gmail.com"
  },
  {
    "nome": "Ícaro Lomeo de Oliveira",
    "telefone": "5531983060212@s.whatsapp.net",
    "email": "rosane.lomeo@gmail.com"
  },
  {
    "nome": "Felpe Brito",
    "telefone": "5531991330808@s.whatsapp.net",
    "email": "323127632321@gmail.com"
  },
  {
    "nome": "Diego Lopes Ribeiro",
    "telefone": "5531998799268@s.whatsapp.net",
    "email": "ururueue@gmail.com"
  },
  {
    "nome": "Stella l.",
    "telefone": "5531996465157@s.whatsapp.net",
    "email": "stellalopes9@yahoo.com.br"
  }
];

export const seedDatabase = async () => {
    console.log('--- Verificando Importação de Clientes (Seed) ---');
    
    try {
        const dbPath = path.join(__dirname, 'barbearia.db');
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        let inseridos = 0;

        for (const cliente of novosClientes) {
            const existe = await db.get('SELECT id FROM clientes WHERE telefone = ?', [cliente.telefone]);
            
            if (!existe) {
                await db.run(
                    'INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)',
                    [cliente.nome, cliente.telefone, cliente.email]
                );
                inseridos++;
            }
        }

        if (inseridos > 0) {
            console.log(`Seed concluído: ${inseridos} novos clientes inseridos.`);
        } else {
            console.log('Nenhum cliente novo para inserir.');
        }
        
        await db.close();
    } catch (error) {
        console.error('Erro no Seed:', error.message);
    }
};
