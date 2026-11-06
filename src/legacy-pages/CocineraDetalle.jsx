import RecordActions from "../components/demo/RecordActions.jsx";
import { Link, useParams } from "react-router-dom";
import useRemoteData from "./useRemoteData.js";
import { getCocineraById } from "../services/api.js";
import { Loading } from "./CatalogPage.jsx";
import {
  SourceNote,
  PublicRelations,
} from "../components/catalog/PublicDetails.jsx";
export default function CocineraDetalle() {
  const { id } = useParams(),
    result = useRemoteData(() => getCocineraById(id), [id]),
    data = result.data;
  return (
    <Loading {...result}>
      {data ? (
        <>
          <Link className="detail-back" to="/cocineras">
            ← Volver al directorio
          </Link>
          <div className="g-h">
            <h1>{data.n}</h1>
            <p>
              {data.rol} · {data.m}
              {data.community ? ` · ${data.community}` : ""}
            </p>
          </div>
          <RecordActions
            resource="cocineras"
            id={id}
            label="cocinera o cocinero"
          />
          <div className="detail-layout">
            <section className="g-card public-person public-body">
              {data.q && <div className="g-quote">“{data.q}”</div>}
              <h3>Biografía y trayectoria</h3>
              <p className="g-p">{data.bio}</p>
              <h3>Especialidades</h3>
              <div className="g-chips">
                {data.esp.map((t) => (
                  <span className="g-chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <h3>Recetas insignia</h3>
              {data.relations?.filter((r) => r.type === "receta").length
                ? data.relations
                    .filter((r) => r.type === "receta")
                    .map((r) => (
                      <Link
                        className="g-row public-recent"
                        to={r.to}
                        key={r.id}
                      >
                        <b>{r.name}</b>
                      </Link>
                    ))
                : (data.ins || []).map((item) => (
                    <div className="g-row" key={item}>
                      <b>{item}</b>
                    </div>
                  ))}
              {!!data.photos?.length && (
                <>
                  <h3>Fotografías</h3>
                  <div className="person-gallery">
                    {data.photos.map((photo) => (
                      <figure key={photo.id}>
                        <img
                          src={photo.url}
                          alt={photo.metadatos.alt}
                          loading="lazy"
                        />
                        <figcaption>
                          <b>{photo.metadatos.title}</b>
                          <p>{photo.metadatos.description}</p>
                          <small>
                            {photo.metadatos.credit} · {photo.metadatos.license}
                          </small>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
              {!!data.oral?.length && (
                <>
                  <h3>Registros de historia oral</h3>
                  {data.oral.map((audio, i) =>
                    Array.isArray(audio) ? (
                      <div className="g-audio" key={i}>
                        <b>{audio[0]}</b>
                        <small>{audio[1]}</small>
                      </div>
                    ) : (
                      <figure className="oral-record" key={audio.id}>
                        <figcaption>
                          <b>{audio.metadatos.title}</b>
                          {audio.metadatos.date && (
                            <small>{audio.metadatos.date}</small>
                          )}
                          <p className="g-p">{audio.metadatos.description}</p>
                        </figcaption>
                        {audio.url ? (
                          <audio controls preload="none" src={audio.url} />
                        ) : (
                          <p className="foot-note">
                            Audio pendiente de adjuntar
                          </p>
                        )}
                        {(audio.metadatos.credit ||
                          audio.metadatos.license) && (
                          <p className="foot-note">
                            {[audio.metadatos.credit, audio.metadatos.license]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </figure>
                    ),
                  )}
                </>
              )}
              {!!data.lin?.length && (
                <>
                  <h3>Linaje culinario</h3>
                  <div className="g-chain">
                    {data.lin.map((line, i) => (
                      <span key={i}>{line}</span>
                    ))}
                  </div>
                </>
              )}
              {!!data.recognitions?.length && (
                <>
                  <h3>Reconocimientos y participación comunitaria</h3>
                  {data.recognitions.map((r, i) => (
                    <p className="g-p" key={i}>
                      {r}
                    </p>
                  ))}
                </>
              )}
              {!!data.fu?.length && (
                <>
                  <h3>Fuentes</h3>
                  {data.fu.map((source, i) => (
                    <p className="g-p" key={i}>
                      {source}
                    </p>
                  ))}
                </>
              )}
            </section>
            <aside className="g-detail">
              <div className="person-identity">
                {data.photos?.[0] ? (
                  <img
                    className="person-portrait"
                    src={data.photos[0].url}
                    alt={data.photos[0].metadatos.alt}
                  />
                ) : (
                  <span
                    className="g-av"
                    style={{
                      width: 70,
                      height: 70,
                      background: data.c || "#10284C",
                    }}
                  >
                    {data.n
                      .split(" ")
                      .slice(0, 2)
                      .map((v) => v[0])
                      .join("")}
                  </span>
                )}
                <div>
                  <span className={`g-tag ${data.v ? "ok" : "warn"}`}>
                    {data.v ? "Verificada" : "Sin verificar"}
                  </span>
                  <h3>{data.n}</h3>
                  <p className="g-sm">{data.rol}</p>
                </div>
              </div>
              <div className="g-kv">
                <div>
                  <small>Lenguas</small>
                  <b>{data.len}</b>
                </div>
                <div>
                  <small>Colectivo</small>
                  <b>{data.org || "No documentado"}</b>
                </div>
                <div>
                  <small>Recetas vinculadas</small>
                  <b>{data.rec}</b>
                </div>
                <div>
                  <small>Mercados vinculados</small>
                  <b>{data.mer}</b>
                </div>
                {data.est != null && (
                  <div>
                    <small>Estudiantes documentados</small>
                    <b>{data.est}</b>
                  </div>
                )}
                {data.region && (
                  <div>
                    <small>Región</small>
                    <b>{data.region}</b>
                  </div>
                )}
              </div>
              {data.es && (
                <>
                  <h3>Establecimiento vinculado</h3>
                  <p className="g-p">{data.es}</p>
                </>
              )}
              {(data.ver || []).map((v) => (
                <p className="g-p" key={v}>
                  ✓ {v}
                </p>
              ))}
              <SourceNote record={data} />
            </aside>
          </div>
          <PublicRelations record={data} />
        </>
      ) : (
        <div className="empty-state">
          No se encontró la ficha pública.{" "}
          <Link to="/cocineras">Volver al directorio</Link>
        </div>
      )}
    </Loading>
  );
}
