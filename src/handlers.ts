import { FastifyRequest, FastifyReply } from "fastify";
import { PokemonWithStats } from "models/PokemonWithStats";
import * as http from "https";

const promisifyRequest = (path: string) => {
  return new Promise((resolve, reject) => {
    try {
      const clientReq = http.request(
        {
          hostname: "pokeapi.co",
          path,
          protocol: "https:",
          port: 443,
          method: "GET",
          agent: new http.Agent({ keepAlive: false }),
        },
        (res) => {
          if (res.statusCode === 404) {
            return reject(new Error("not found"));
          }
          let data = "";
          res.on("data", (d) => {
            data += d;
          });
          res.on("end", () => {
            resolve(JSON.parse(Buffer.from(data, "utf-8").toString()));
          });
        }
      );

      clientReq.on("error", (e) => {
        reject(e);
      });
      clientReq.end();
    } catch (error) {
      reject(error);
    }
  });
};

export async function getPokemonByName(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const name: string = request.params["name"];

  // as name is a parameter, it will always required so no chance to be null
  var path = `/api/v2/pokemon/${name}`;

  // http request callback converted to promise
  const response = await promisifyRequest(path);

  await computeResponse(response, reply);

  reply.send(response);

  return reply;
}

export const computeResponse = async (response: any, reply: FastifyReply) => {
  let types: string[] = response.types.map(({ type }) => type.url);

  const pokemonTypes: any[] = await Promise.all(
    types.map(
      async (url) =>
        // extract path from url
        await promisifyRequest(url.replace("https://pokeapi.co", ""))
    )
  );

  if (pokemonTypes == undefined) throw pokemonTypes;

  // calculate the average state
  var stats = response.stats.map((element) => element.base_stat);
  if (stats.length === 0) {
    response.averageStat = 0;
  } else {
    let avg = stats.reduce((a, b) => a + b, 0) / stats.length;
    response.averageStat = avg;
  }
};
