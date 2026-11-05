
"use strict";


// ==========================================================================================
// CONFIG
// ==========================================================================================

const CONFIG = {

    dados:
        "dados",

    corRS:
        "#9b3446",

    corBrasil:
        "#143f59",

    corCinza:
        "#c3cbd2",

    coresUF: [
        "#2e80a3",
        "#d07825",
        "#7056a7"
    ],

    coresMapa: [
        "#e8f1f6",
        "#bfd8e5",
        "#87b8d1",
        "#4e91b5",
        "#1f648d"
    ],

    corSemDado:
        "#d9dee3",

    delayPlay:
        900
};


// ==========================================================================================
// ESTADO
// ==========================================================================================

const estado = {

    aba:
        "ufs",

    ano:
        2025,

    resultado:
        "Aprovação",

    etapa:
        "Ensino Fundamental - Total",

    localizacao:
        "Total",

    dependencia:
        "Total",

    municipio:
        null,

    municipioNome:
        null,

    municipioEscolas:
        "",

    escola:
        null,

    tocando:
        false
};


// ==========================================================================================
// DADOS
// ==========================================================================================

const dados = {

    meta:
        null,

    brasilUfsTotal:
        [],

    brasilUfsDetalhado:
        [],

    municipiosTotal:
        [],

    dimMunicipios:
        [],

    geojson:
        null,

    municipiosAno:
        new Map(),

    seriesMunicipais:
        new Map(),

    escolasAno:
        new Map()
};


// ==========================================================================================
// MAPA
// ==========================================================================================

let mapa = null;

let camadaMunicipios = null;

let controleLegenda = null;

let valoresMapa = new Map();

let classesMapa = [];


// ==========================================================================================
// HELPERS
// ==========================================================================================

async function carregarJSON(
    caminho
) {

    const resposta =
        await fetch(
            caminho
        );


    if (!resposta.ok) {

        throw new Error(
            `Erro ${resposta.status}: ${caminho}`
        );
    }


    return await resposta.json();
}


function numero(
    valor
) {

    if (
        valor === null
        ||
        valor === undefined
        ||
        valor === ""
    ) {

        return null;
    }


    const n =
        Number(
            valor
        );


    return Number.isFinite(
        n
    )
        ?
        n
        :
        null;
}


function pct(
    valor
) {

    const n =
        numero(
            valor
        );


    if (
        n === null
    ) {

        return "—";
    }


    return (
        n.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits:
                    1,

                maximumFractionDigits:
                    1
            }
        )
        +
        "%"
    );
}


function escapar(
    valor
) {

    return String(
        valor ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );
}


function melhorMaior() {

    return (
        estado.resultado
        ===
        "Aprovação"
    );
}


function totalTotal() {

    return (
        estado.localizacao
        ===
        "Total"
        &&
        estado.dependencia
        ===
        "Total"
    );
}


function correspondeDetalhe(
    linha
) {

    return (
        linha.localizacao
        ===
        estado.localizacao
        &&
        linha.dependencia
        ===
        estado.dependencia
    );
}


function status(
    texto
) {

    const el =
        document.getElementById(
            "statusTexto"
        );


    if (el) {

        el.textContent =
            texto;
    }
}


function rotuloEtapa() {

    return estado.etapa.replace(
        " - ",
        " — "
    );
}


function campoMetrica() {

    const m =
        dados.meta.metricas.find(
            x =>
                x.resultado
                ===
                estado.resultado
                &&
                x.etapa
                ===
                estado.etapa
        );


    if (!m) {

        throw new Error(
            "Métrica não encontrada."
        );
    }


    return m.campo;
}


// ==========================================================================================
// CAMPOS DA COMPOSIÇÃO
// ==========================================================================================

function camposComposicao() {

    const sufixos = {

        "Ensino Fundamental - Total":
            "fun",

        "Ensino Fundamental - Anos Iniciais":
            "fun_ai",

        "Ensino Fundamental - Anos Finais":
            "fun_af",

        "Ensino Médio - Total":
            "med"
    };


    const s =
        sufixos[
            estado.etapa
        ];


    return {

        aprovacao:
            `aprov_${s}`,

        reprovacao:
            `reprov_${s}`,

        abandono:
            `aband_${s}`
    };
}


function composicaoLinha(
    linha
) {

    if (!linha) {

        return null;
    }


    const c =
        camposComposicao();


    const aprovacao =
        numero(
            linha[
                c.aprovacao
            ]
        );


    const reprovacao =
        numero(
            linha[
                c.reprovacao
            ]
        );


    const abandono =
        numero(
            linha[
                c.abandono
            ]
        );


    if (
        aprovacao === null
        ||
        reprovacao === null
        ||
        abandono === null
    ) {

        return null;
    }


    return {
        aprovacao,
        reprovacao,
        abandono
    };
}


// ==========================================================================================
// DONUT COMPACTO
// ==========================================================================================

function renderDonut(
    graficoId,
    resumoId,
    composicao,
    centro
) {

    const div =
        document.getElementById(
            graficoId
        );


    const resumo =
        document.getElementById(
            resumoId
        );


    if (
        !div
        ||
        !resumo
    ) {

        return;
    }


    if (!composicao) {

        Plotly.purge(
            div
        );


        resumo.innerHTML =
            `
            <div class="donut-sem-dado">
                Sem dados completos para aprovação,
                reprovação e abandono neste recorte.
            </div>
            `;


        return;
    }


    const cores = [
        "#bb503e",
        "#bc9623",
        "#6d759a"
    ];


    Plotly.react(
        div,
        [
            {
                type:
                    "pie",

                values: [
                    composicao.aprovacao,
                    composicao.reprovacao,
                    composicao.abandono
                ],

                labels: [
                    "Aprovação",
                    "Reprovação",
                    "Abandono"
                ],

                hole:
                    .68,

                sort:
                    false,

                textinfo:
                    "none",

                marker: {

                    colors:
                        cores,

                    line: {
                        color:
                            "#fff",

                        width:
                            2
                    }
                },

                hovertemplate:
                    "<b>%{label}</b><br>%{value:.1f}%<extra></extra>"
            }
        ],
        {
            margin: {
                l:
                    8,
                r:
                    8,
                t:
                    8,
                b:
                    8
            },

            paper_bgcolor:
                "rgba(0,0,0,0)",

            plot_bgcolor:
                "rgba(0,0,0,0)",

            showlegend:
                false,

            annotations: [
                {
                    text:
                        `<b>${centro}</b>`,

                    x:
                        .5,

                    y:
                        .5,

                    showarrow:
                        false,

                    align:
                        "center",

                    font: {
                        family:
                            "Inter, sans-serif",

                        size:
                            11,

                        color:
                            "#344054"
                    }
                }
            ]
        },
        {
            responsive:
                true,

            displayModeBar:
                false,

            displaylogo:
                false
        }
    );


    resumo.innerHTML =
        `
        <div class="donut-item">

            <span
                class="donut-bola"
                style="background:${cores[0]}"
            ></span>

            <span>
                Aprovação
            </span>

            <strong>
                ${pct(composicao.aprovacao)}
            </strong>

        </div>


        <div class="donut-item">

            <span
                class="donut-bola"
                style="background:${cores[1]}"
            ></span>

            <span>
                Reprovação
            </span>

            <strong>
                ${pct(composicao.reprovacao)}
            </strong>

        </div>


        <div class="donut-item">

            <span
                class="donut-bola"
                style="background:${cores[2]}"
            ></span>

            <span>
                Abandono
            </span>

            <strong>
                ${pct(composicao.abandono)}
            </strong>

        </div>
        `;
}


// ==========================================================================================
// BASE UFs
// ==========================================================================================

function baseUF() {

    if (
        totalTotal()
    ) {

        return dados.brasilUfsTotal;
    }


    return dados.brasilUfsDetalhado.filter(
        correspondeDetalhe
    );
}


function baseUFAno() {

    return baseUF().filter(
        x =>
            Number(
                x.ano
            )
            ===
            estado.ano
    );
}


// ==========================================================================================
// COMPARADORES
// ==========================================================================================

function ufsComparadas() {

    return [
        "compararUF1",
        "compararUF2",
        "compararUF3"
    ]
    .map(
        id =>
            document.getElementById(
                id
            )?.value
            ||
            ""
    )
    .filter(
        x =>
            x
            &&
            x !== "RS"
    )
    .filter(
        (
            x,
            i,
            a
        ) =>
            a.indexOf(
                x
            )
            ===
            i
    );
}


// ==========================================================================================
// UFs - KPIs
// ==========================================================================================

function atualizarKpisUF() {

    const campo =
        campoMetrica();


    const linhas =
        baseUFAno();


    const brasil =
        linhas.find(
            x =>
                x.abrangencia
                ===
                "BRASIL"
        );


    const ufs =
        linhas.filter(
            x =>
                x.abrangencia
                ===
                "UF"
        );


    const rs =
        ufs.find(
            x =>
                x.codigo
                ===
                "RS"
        );


    const valorBrasil =
        numero(
            brasil?.[
                campo
            ]
        );


    const valorRS =
        numero(
            rs?.[
                campo
            ]
        );


    const vals =
        ufs
        .map(
            x =>
                numero(
                    x[
                        campo
                    ]
                )
        )
        .filter(
            x =>
                x !== null
        );


    const media =
        vals.length
        ?
            vals.reduce(
                (
                    a,
                    b
                ) =>
                    a + b,
                0
            )
            /
            vals.length
        :
            null;


    const ranking =
        ufs
        .map(
            x => ({
                codigo:
                    x.codigo,

                valor:
                    numero(
                        x[
                            campo
                        ]
                    )
            })
        )
        .filter(
            x =>
                x.valor
                !==
                null
        )
        .sort(
            (
                a,
                b
            ) =>
                melhorMaior()
                ?
                    b.valor - a.valor
                :
                    a.valor - b.valor
        );


    const pos =
        ranking.findIndex(
            x =>
                x.codigo
                ===
                "RS"
        );


    document.getElementById(
        "kpiBrasil"
    ).textContent =
        pct(
            valorBrasil
        );


    document.getElementById(
        "kpiRS"
    ).textContent =
        pct(
            valorRS
        );


    document.getElementById(
        "kpiMediaUF"
    ).textContent =
        pct(
            media
        );


    document.getElementById(
        "kpiPosicaoRS"
    ).textContent =
        pos >= 0
        ?
            `${pos + 1}º`
        :
            "—";


    document.getElementById(
        "kpiPosicaoNota"
    ).textContent =
        `entre ${ranking.length || 27} UFs`;
}


// ==========================================================================================
// UFs - RANKING
// ==========================================================================================

function atualizarRankingUF() {

    const campo =
        campoMetrica();


    const comparadas =
        ufsComparadas();


    const linhas =
        baseUFAno()
        .filter(
            x =>
                x.abrangencia
                ===
                "UF"
        )
        .map(
            x => ({
                codigo:
                    x.codigo,

                nome:
                    x.nome,

                valor:
                    numero(
                        x[
                            campo
                        ]
                    )
            })
        )
        .filter(
            x =>
                x.valor
                !==
                null
        )
        .sort(
            (
                a,
                b
            ) =>
                melhorMaior()
                ?
                    b.valor - a.valor
                :
                    a.valor - b.valor
        );


    const cores =
        linhas.map(
            x => {

                if (
                    x.codigo
                    ===
                    "RS"
                ) {

                    return CONFIG.corRS;
                }


                const i =
                    comparadas.indexOf(
                        x.codigo
                    );


                if (
                    i >= 0
                ) {

                    return CONFIG.coresUF[
                        i
                        %
                        CONFIG.coresUF.length
                    ];
                }


                return CONFIG.corCinza;
            }
        );


    Plotly.react(
        "graficoRankingUF",
        [
            {
                type:
                    "bar",

                orientation:
                    "h",

                x:
                    linhas.map(
                        x =>
                            x.valor
                    ),

                y:
                    linhas.map(
                        x =>
                            x.nome
                    ),

                marker: {
                    color:
                        cores
                },

                text:
                    linhas.map(
                        x =>
                            pct(
                                x.valor
                            )
                    ),

                textposition:
                    "outside",

                hovertemplate:
                    "<b>%{y}</b><br>%{x:.1f}%<extra></extra>"
            }
        ],
        {
            margin: {
                l:
                    145,
                r:
                    50,
                t:
                    8,
                b:
                    35
            },

            paper_bgcolor:
                "rgba(0,0,0,0)",

            plot_bgcolor:
                "rgba(0,0,0,0)",

            font: {
                family:
                    "Inter, sans-serif",

                size:
                    9,

                color:
                    "#475467"
            },

            showlegend:
                false,

            bargap:
                .27,

            xaxis: {
                ticksuffix:
                    "%",

                gridcolor:
                    "#edf0f2",

                zeroline:
                    false,

                fixedrange:
                    true
            },

            yaxis: {
                autorange:
                    "reversed",

                fixedrange:
                    true
            },

            transition: {
                duration:
                    420,

                easing:
                    "cubic-in-out"
            }
        },
        {
            responsive:
                true,

            displaylogo:
                false,

            displayModeBar:
                false
        }
    );
}


// ==========================================================================================
// UFs - COMPARAÇÃO
// ==========================================================================================

function atualizarComparacaoUF() {

    const campo =
        campoMetrica();


    const base =
        baseUF();


    const selecionadas =
        ufsComparadas();


    const traces = [];


    const codigos =
        [
            ...new Set(
                base
                .filter(
                    x =>
                        x.abrangencia
                        ===
                        "UF"
                )
                .map(
                    x =>
                        x.codigo
                )
            )
        ];


    // fundo das demais UFs
    for (
        const codigo
        of codigos
    ) {

        if (
            codigo === "RS"
            ||
            selecionadas.includes(
                codigo
            )
        ) {

            continue;
        }


        const s =
            base
            .filter(
                x =>
                    x.abrangencia
                    ===
                    "UF"
                    &&
                    x.codigo
                    ===
                    codigo
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.ano
                    )
                    -
                    Number(
                        b.ano
                    )
            );


        traces.push({

            type:
                "scatter",

            mode:
                "lines",

            x:
                s.map(
                    x =>
                        Number(
                            x.ano
                        )
                ),

            y:
                s.map(
                    x =>
                        numero(
                            x[
                                campo
                            ]
                        )
                ),

            showlegend:
                false,

            hoverinfo:
                "skip",

            line: {
                color:
                    "rgba(155,165,175,.20)",

                width:
                    1
            },

            connectgaps:
                false
        });
    }


    // Brasil
    const brasil =
        base
        .filter(
            x =>
                x.abrangencia
                ===
                "BRASIL"
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(
                    a.ano
                )
                -
                Number(
                    b.ano
                )
        );


    traces.push({

        type:
            "scatter",

        mode:
            "lines+markers",

        name:
            "Brasil",

        x:
            brasil.map(
                x =>
                    Number(
                        x.ano
                    )
            ),

        y:
            brasil.map(
                x =>
                    numero(
                        x[
                            campo
                        ]
                    )
            ),

        line: {
            color:
                CONFIG.corBrasil,

            width:
                2,

            dash:
                "dot"
        },

        marker: {
            size:
                4
        },

        connectgaps:
            false
    });


    // UFs selecionadas
    selecionadas.forEach(
        (
            codigo,
            i
        ) => {

            const s =
                base
                .filter(
                    x =>
                        x.abrangencia
                        ===
                        "UF"
                        &&
                        x.codigo
                        ===
                        codigo
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        Number(
                            a.ano
                        )
                        -
                        Number(
                            b.ano
                        )
                );


            traces.push({

                type:
                    "scatter",

                mode:
                    "lines+markers",

                name:
                    s[0]?.nome
                    ||
                    codigo,

                x:
                    s.map(
                        x =>
                            Number(
                                x.ano
                            )
                    ),

                y:
                    s.map(
                        x =>
                            numero(
                                x[
                                    campo
                                ]
                            )
                    ),

                line: {
                    color:
                        CONFIG.coresUF[
                            i
                            %
                            CONFIG.coresUF.length
                        ],

                    width:
                        2.4
                },

                marker: {
                    size:
                        5
                },

                connectgaps:
                    false
            });
        }
    );


    // RS
    const rs =
        base
        .filter(
            x =>
                x.abrangencia
                ===
                "UF"
                &&
                x.codigo
                ===
                "RS"
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(
                    a.ano
                )
                -
                Number(
                    b.ano
                )
        );


    traces.push({

        type:
            "scatter",

        mode:
            "lines+markers",

        name:
            "Rio Grande do Sul",

        x:
            rs.map(
                x =>
                    Number(
                        x.ano
                    )
            ),

        y:
            rs.map(
                x =>
                    numero(
                        x[
                            campo
                        ]
                    )
            ),

        line: {
            color:
                CONFIG.corRS,

            width:
                3.5
        },

        marker: {
            size:
                6
        },

        connectgaps:
            false
    });


    Plotly.react(
        "graficoComparacaoUF",
        traces,
        {
            margin: {
                l:
                    48,
                r:
                    15,
                t:
                    20,
                b:
                    42
            },

            paper_bgcolor:
                "rgba(0,0,0,0)",

            plot_bgcolor:
                "rgba(0,0,0,0)",

            hovermode:
                "x unified",

            font: {
                family:
                    "Inter, sans-serif",

                size:
                    9,

                color:
                    "#475467"
            },

            legend: {
                orientation:
                    "h",

                x:
                    0,

                y:
                    1.13
            },

            xaxis: {
                dtick:
                    1,

                gridcolor:
                    "#edf0f2",

                fixedrange:
                    true
            },

            yaxis: {
                ticksuffix:
                    "%",

                gridcolor:
                    "#edf0f2",

                fixedrange:
                    true
            }
        },
        {
            responsive:
                true,

            displaylogo:
                false
        }
    );
}


// ==========================================================================================
// DONUT RS
// ==========================================================================================

function atualizarDonutRS() {

    const linha =
        baseUFAno().find(
            x =>
                x.abrangencia
                ===
                "UF"
                &&
                x.codigo
                ===
                "RS"
        );


    renderDonut(
        "graficoDonutRS",
        "donutRSTexto",
        composicaoLinha(
            linha
        ),
        `RS<br>${estado.ano}`
    );
}


// ==========================================================================================
// ATUALIZAR UFs
// ==========================================================================================

function atualizarUFs() {

    document.getElementById(
        "resumoSelecaoUF"
    ).textContent =
        (
            `${estado.resultado} · `
            +
            `${rotuloEtapa()} · `
            +
            `${estado.localizacao} · `
            +
            `${estado.dependencia} · `
            +
            `${estado.ano}`
        );


    atualizarKpisUF();

    atualizarRankingUF();

    atualizarComparacaoUF();

    atualizarDonutRS();
}


// ==========================================================================================
// MUNICÍPIOS - DADOS
// ==========================================================================================

async function carregarMunicipiosAno(
    ano
) {

    if (
        dados.municipiosAno.has(
            ano
        )
    ) {

        return dados.municipiosAno.get(
            ano
        );
    }


    const base =
        await carregarJSON(
            `${CONFIG.dados}/municipios/${ano}.json`
        );


    dados.municipiosAno.set(
        ano,
        base
    );


    return base;
}


async function carregarSerieMunicipal(
    codigo
) {

    codigo =
        String(
            codigo
        );


    if (
        dados.seriesMunicipais.has(
            codigo
        )
    ) {

        return dados.seriesMunicipais.get(
            codigo
        );
    }


    const base =
        await carregarJSON(
            `${CONFIG.dados}/municipios_series/${codigo}.json`
        );


    dados.seriesMunicipais.set(
        codigo,
        base
    );


    return base;
}


async function valoresMunicipaisSelecionados() {

    const campo =
        campoMetrica();


    let linhas;


    if (
        totalTotal()
    ) {

        linhas =
            dados.municipiosTotal.filter(
                x =>
                    Number(
                        x.ano
                    )
                    ===
                    estado.ano
            );
    }

    else {

        const anual =
            await carregarMunicipiosAno(
                estado.ano
            );


        linhas =
            anual.filter(
                correspondeDetalhe
            );
    }


    const m =
        new Map();


    for (
        const x
        of linhas
    ) {

        m.set(
            String(
                x.codigo
            ),
            numero(
                x[
                    campo
                ]
            )
        );
    }


    return m;
}


// ==========================================================================================
// QUANTIS
// ==========================================================================================

function quantil(
    valores,
    q
) {

    if (!valores.length) {

        return null;
    }


    const a =
        [
            ...valores
        ].sort(
            (
                x,
                y
            ) =>
                x - y
        );


    const p =
        (
            a.length - 1
        )
        *
        q;


    const b =
        Math.floor(
            p
        );


    const r =
        p - b;


    if (
        a[
            b + 1
        ]
        !==
        undefined
    ) {

        return (
            a[
                b
            ]
            +
            r
            *
            (
                a[
                    b + 1
                ]
                -
                a[
                    b
                ]
            )
        );
    }


    return a[
        b
    ];
}


function criarClasses(
    mapaValores
) {

    const nums =
        [
            ...mapaValores.values()
        ]
        .filter(
            x =>
                x !== null
        );


    if (!nums.length) {

        return [];
    }


    return [
        quantil(
            nums,
            .20
        ),
        quantil(
            nums,
            .40
        ),
        quantil(
            nums,
            .60
        ),
        quantil(
            nums,
            .80
        )
    ];
}


function corMapa(
    valor
) {

    if (
        valor === null
        ||
        classesMapa.length !== 4
    ) {

        return CONFIG.corSemDado;
    }


    if (
        valor <= classesMapa[0]
    ) {

        return CONFIG.coresMapa[0];
    }


    if (
        valor <= classesMapa[1]
    ) {

        return CONFIG.coresMapa[1];
    }


    if (
        valor <= classesMapa[2]
    ) {

        return CONFIG.coresMapa[2];
    }


    if (
        valor <= classesMapa[3]
    ) {

        return CONFIG.coresMapa[3];
    }


    return CONFIG.coresMapa[4];
}


// ==========================================================================================
// MAPA
// ==========================================================================================

function estiloMunicipio(
    feature
) {

    const codigo =
        String(
            feature.properties.codigo
        );


    const valor =
        valoresMapa.has(
            codigo
        )
        ?
            valoresMapa.get(
                codigo
            )
        :
            null;


    const ativo =
        String(
            estado.municipio
        )
        ===
        codigo;


    return {

        fillColor:
            corMapa(
                valor
            ),

        fillOpacity:
            .82,

        color:
            ativo
            ?
                "#111827"
            :
                "#ffffff",

        weight:
            ativo
            ?
                2.5
            :
                .65,

        opacity:
            1
    };
}


function iniciarMapa() {

    if (mapa) {

        setTimeout(
            () =>
                mapa.invalidateSize(),
            80
        );

        return;
    }


    mapa =
        L.map(
            "mapa",
            {
                zoomControl:
                    true
            }
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
        {
            attribution:
                "&copy; OpenStreetMap contributors",

            subdomains:
                "abc",

            maxZoom:
                12,

            crossOrigin:
                true
        }
    )
    .addTo(
        mapa
    );


    camadaMunicipios =
        L.geoJSON(
            dados.geojson,
            {

                style:
                    estiloMunicipio,

                onEachFeature:
                    (
                        feature,
                        layer
                    ) => {

                        layer.on(
                            "mouseover",
                            () => {

                                const codigo =
                                    String(
                                        feature.properties.codigo
                                    );


                                const valor =
                                    valoresMapa.has(
                                        codigo
                                    )
                                    ?
                                        valoresMapa.get(
                                            codigo
                                        )
                                    :
                                        null;


                                layer.bindTooltip(
                                    `
                                    <strong>
                                        ${escapar(feature.properties.nome)}
                                    </strong>
                                    <br>
                                    ${pct(valor)}
                                    `,
                                    {
                                        sticky:
                                            true
                                    }
                                )
                                .openTooltip();
                            }
                        );


                        layer.on(
                            "click",
                            async () => {

                                await selecionarMunicipio(
                                    String(
                                        feature.properties.codigo
                                    ),
                                    feature.properties.nome
                                );
                            }
                        );
                    }
            }
        )
        .addTo(
            mapa
        );


    mapa.fitBounds(
        camadaMunicipios.getBounds(),
        {
            padding: [
                7,
                7
            ]
        }
    );


    controleLegenda =
        L.control(
            {
                position:
                    "bottomright"
            }
        );


    controleLegenda.onAdd =
        function() {

            const div =
                L.DomUtil.create(
                    "div",
                    "mapa-legenda"
                );


            div.id =
                "legendaMapa";


            return div;
        };


    controleLegenda.addTo(
        mapa
    );


    setTimeout(
        () =>
            mapa.invalidateSize(),
        100
    );
}


function atualizarLegenda() {

    const el =
        document.getElementById(
            "legendaMapa"
        );


    if (!el) {

        return;
    }


    if (
        classesMapa.length !== 4
    ) {

        el.innerHTML =
            `
            <div class="legenda-titulo">
                ${escapar(estado.resultado)}
            </div>

            Sem valores disponíveis.
            `;

        return;
    }


    const b =
        classesMapa;


    const faixas = [

        `≤ ${pct(b[0])}`,

        `${pct(b[0])} – ${pct(b[1])}`,

        `${pct(b[1])} – ${pct(b[2])}`,

        `${pct(b[2])} – ${pct(b[3])}`,

        `> ${pct(b[3])}`
    ];


    let html =
        `
        <div class="legenda-titulo">
            ${escapar(estado.resultado)}
        </div>
        `;


    faixas.forEach(
        (
            f,
            i
        ) => {

            html +=
                `
                <div class="legenda-item">

                    <span
                        class="legenda-cor"
                        style="background:${CONFIG.coresMapa[i]}"
                    ></span>

                    <span>
                        ${f}
                    </span>

                </div>
                `;
        }
    );


    html +=
        `
        <div class="legenda-item">

            <span
                class="legenda-cor"
                style="background:${CONFIG.corSemDado}"
            ></span>

            <span>
                Sem dado
            </span>

        </div>
        `;


    el.innerHTML =
        html;
}


// ==========================================================================================
// RANKING MUNICIPAL
// ==========================================================================================

function atualizarRankingMunicipal() {

    const container =
        document.getElementById(
            "rankingMunicipios"
        );


    const linhas =
        dados.dimMunicipios.map(
            m => {

                const codigo =
                    String(
                        m.codigo
                    );


                return {

                    codigo,

                    nome:
                        m.nome,

                    valor:
                        valoresMapa.has(
                            codigo
                        )
                        ?
                            valoresMapa.get(
                                codigo
                            )
                        :
                            null
                };
            }
        );


    linhas.sort(
        (
            a,
            b
        ) => {

            if (
                a.valor === null
                &&
                b.valor === null
            ) {

                return a.nome.localeCompare(
                    b.nome,
                    "pt-BR"
                );
            }


            if (
                a.valor === null
            ) {

                return 1;
            }


            if (
                b.valor === null
            ) {

                return -1;
            }


            return melhorMaior()
                ?
                    b.valor - a.valor
                :
                    a.valor - b.valor;
        }
    );


    let p =
        0;


    let validos =
        0;


    container.innerHTML =
        linhas.map(
            x => {

                let posicao =
                    "—";


                if (
                    x.valor !== null
                ) {

                    p++;

                    validos++;

                    posicao =
                        `${p}º`;
                }


                return `
                <div
                    class="rank-row ${
                        String(
                            estado.municipio
                        )
                        ===
                        x.codigo
                        ?
                            "ativo"
                        :
                            ""
                    }"
                    data-codigo="${escapar(x.codigo)}"
                    data-nome="${escapar(x.nome)}"
                >

                    <div class="rank-pos">
                        ${posicao}
                    </div>

                    <div class="rank-nome">
                        ${escapar(x.nome)}
                    </div>

                    <div class="rank-valor ${
                        x.valor === null
                        ?
                            "sem-dado"
                        :
                            ""
                    }">
                        ${pct(x.valor)}
                    </div>

                </div>
                `;
            }
        )
        .join(
            ""
        );


    document.getElementById(
        "rankingMunicipalResumo"
    ).textContent =
        `${validos} municípios com valor disponível`;


    container.querySelectorAll(
        ".rank-row"
    )
    .forEach(
        el => {

            el.addEventListener(
                "click",
                async () => {

                    await selecionarMunicipio(
                        el.dataset.codigo,
                        el.dataset.nome
                    );
                }
            );
        }
    );
}


// ==========================================================================================
// MUNICÍPIO SELECIONADO
// ==========================================================================================

async function selecionarMunicipio(
    codigo,
    nome
) {

    estado.municipio =
        String(
            codigo
        );


    estado.municipioNome =
        nome;


    document.getElementById(
        "filtroMunicipio"
    ).value =
        String(
            codigo
        );


    document.getElementById(
        "tituloMunicipioSelecionado"
    ).textContent =
        nome;


    document.getElementById(
        "tituloDonutMunicipio"
    ).textContent =
        nome;


    if (
        camadaMunicipios
    ) {

        camadaMunicipios.setStyle(
            estiloMunicipio
        );
    }


    atualizarRankingMunicipal();


    await atualizarDetalheMunicipio();
}


// ==========================================================================================
// SÉRIE MUNICIPAL
// ==========================================================================================

async function atualizarDetalheMunicipio() {

    if (
        !estado.municipio
    ) {

        Plotly.purge(
            "graficoMunicipio"
        );


        renderDonut(
            "graficoDonutMunicipio",
            "donutMunicipioTexto",
            null,
            ""
        );


        return;
    }


    const campo =
        campoMetrica();


    const serie =
        await carregarSerieMunicipal(
            estado.municipio
        );


    // MESMOS FILTROS PARA TODOS OS ANOS
    const municipio =
        serie
        .filter(
            correspondeDetalhe
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(
                    a.ano
                )
                -
                Number(
                    b.ano
                )
        );


    const ufBase =
        baseUF();


    const rs =
        ufBase
        .filter(
            x =>
                x.abrangencia
                ===
                "UF"
                &&
                x.codigo
                ===
                "RS"
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(
                    a.ano
                )
                -
                Number(
                    b.ano
                )
        );


    const brasil =
        ufBase
        .filter(
            x =>
                x.abrangencia
                ===
                "BRASIL"
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(
                    a.ano
                )
                -
                Number(
                    b.ano
                )
        );


    Plotly.react(
        "graficoMunicipio",
        [

            {
                type:
                    "scatter",

                mode:
                    "lines",

                name:
                    "Brasil",

                x:
                    brasil.map(
                        x =>
                            Number(
                                x.ano
                            )
                    ),

                y:
                    brasil.map(
                        x =>
                            numero(
                                x[
                                    campo
                                ]
                            )
                    ),

                line: {
                    color:
                        "#7b858e",

                    width:
                        1.7,

                    dash:
                        "dot"
                },

                connectgaps:
                    false
            },


            {
                type:
                    "scatter",

                mode:
                    "lines+markers",

                name:
                    "Rio Grande do Sul",

                x:
                    rs.map(
                        x =>
                            Number(
                                x.ano
                            )
                    ),

                y:
                    rs.map(
                        x =>
                            numero(
                                x[
                                    campo
                                ]
                            )
                    ),

                line: {
                    color:
                        CONFIG.corRS,

                    width:
                        2.3
                },

                marker: {
                    size:
                        4
                },

                connectgaps:
                    false
            },


            {
                type:
                    "scatter",

                mode:
                    "lines+markers",

                name:
                    estado.municipioNome,

                x:
                    municipio.map(
                        x =>
                            Number(
                                x.ano
                            )
                    ),

                y:
                    municipio.map(
                        x =>
                            numero(
                                x[
                                    campo
                                ]
                            )
                    ),

                line: {
                    color:
                        CONFIG.corBrasil,

                    width:
                        3.3
                },

                marker: {
                    size:
                        5
                },

                connectgaps:
                    false
            }

        ],
        {
            margin: {
                l:
                    48,
                r:
                    15,
                t:
                    18,
                b:
                    40
            },

            paper_bgcolor:
                "rgba(0,0,0,0)",

            plot_bgcolor:
                "rgba(0,0,0,0)",

            hovermode:
                "x unified",

            font: {
                family:
                    "Inter, sans-serif",

                size:
                    9,

                color:
                    "#475467"
            },

            legend: {
                orientation:
                    "h",

                x:
                    0,

                y:
                    1.13
            },

            xaxis: {
                dtick:
                    1,

                gridcolor:
                    "#edf0f2",

                fixedrange:
                    true
            },

            yaxis: {
                ticksuffix:
                    "%",

                gridcolor:
                    "#edf0f2",

                fixedrange:
                    true
            }
        },
        {
            responsive:
                true,

            displaylogo:
                false
        }
    );


    // ----------------------------------------------------------------------
    // DONUT: MESMO MUNICÍPIO + MESMO ANO + MESMOS FILTROS
    // ----------------------------------------------------------------------

    const linhaAtual =
        municipio.find(
            x =>
                Number(
                    x.ano
                )
                ===
                estado.ano
        )
        ||
        null;


    document.getElementById(
        "subtituloDonutMunicipio"
    ).textContent =
        (
            `${estado.ano} · `
            +
            `${rotuloEtapa()} · `
            +
            `${estado.localizacao} · `
            +
            `${estado.dependencia}`
        );


    renderDonut(
        "graficoDonutMunicipio",
        "donutMunicipioTexto",
        composicaoLinha(
            linhaAtual
        ),
        `${estado.ano}`
    );
}


// ==========================================================================================
// ATUALIZAR ABA MUNICÍPIOS
// ==========================================================================================

async function atualizarMunicipios() {

    iniciarMapa();


    valoresMapa =
        await valoresMunicipaisSelecionados();


    classesMapa =
        criarClasses(
            valoresMapa
        );


    camadaMunicipios.setStyle(
        estiloMunicipio
    );


    atualizarLegenda();

    atualizarRankingMunicipal();


    document.getElementById(
        "mapaSubtitulo"
    ).textContent =
        (
            `${estado.resultado} · `
            +
            `${rotuloEtapa()} · `
            +
            `${estado.localizacao} · `
            +
            `${estado.dependencia} · `
            +
            `${estado.ano}`
        );


    await atualizarDetalheMunicipio();


    setTimeout(
        () =>
            mapa.invalidateSize(),
        80
    );
}


// ==========================================================================================
// ESCOLAS
// ==========================================================================================

async function carregarEscolasAno(
    ano
) {

    if (
        dados.escolasAno.has(
            ano
        )
    ) {

        return dados.escolasAno.get(
            ano
        );
    }


    const base =
        await carregarJSON(
            `${CONFIG.dados}/escolas/${ano}.json`
        );


    dados.escolasAno.set(
        ano,
        base
    );


    return base;
}


function redeEscolaOK(
    x
) {

    if (
        estado.dependencia
        ===
        "Total"
    ) {

        return true;
    }


    if (
        estado.dependencia
        ===
        "Pública"
    ) {

        return [
            "Federal",
            "Estadual",
            "Municipal"
        ].includes(
            x.dependencia
        );
    }


    return (
        x.dependencia
        ===
        estado.dependencia
    );
}


function localEscolaOK(
    x
) {

    if (
        estado.localizacao
        ===
        "Total"
    ) {

        return true;
    }


    return (
        x.localizacao
        ===
        estado.localizacao
    );
}


async function atualizarEscolas() {

    const campo =
        campoMetrica();


    const base =
        await carregarEscolasAno(
            estado.ano
        );


    let linhas =
        base
        .filter(
            x =>
                numero(
                    x[
                        campo
                    ]
                )
                !==
                null
        )
        .filter(
            redeEscolaOK
        )
        .filter(
            localEscolaOK
        );


    if (
        estado.municipioEscolas
    ) {

        linhas =
            linhas.filter(
                x =>
                    String(
                        x.cod_municipio
                    )
                    ===
                    String(
                        estado.municipioEscolas
                    )
            );
    }


    linhas.sort(
        (
            a,
            b
        ) => {

            const va =
                numero(
                    a[
                        campo
                    ]
                );


            const vb =
                numero(
                    b[
                        campo
                    ]
                );


            return melhorMaior()
                ?
                    vb - va
                :
                    va - vb;
        }
    );


    let selecionada =
        linhas.find(
            x =>
                String(
                    x.cod_escola
                )
                ===
                String(
                    estado.escola
                )
        );


    if (
        !selecionada
    ) {

        selecionada =
            linhas[
                0
            ]
            ||
            null;


        estado.escola =
            selecionada
            ?
                String(
                    selecionada.cod_escola
                )
            :
                null;
    }


    document.getElementById(
        "escolasEncontradas"
    ).textContent =
        linhas.length.toLocaleString(
            "pt-BR"
        );


    const container =
        document.getElementById(
            "listaEscolas"
        );


    container.innerHTML =
        `

        <table class="tabela-escolas">

            <thead>

                <tr>

                    <th>
                        #
                    </th>

                    <th>
                        Escola
                    </th>

                    <th>
                        Município
                    </th>

                    <th>
                        Rede
                    </th>

                    <th>
                        Localização
                    </th>

                    <th class="numero">
                        ${escapar(estado.resultado)}
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    linhas.map(
                        (
                            x,
                            i
                        ) => `

                        <tr
                            data-index="${i}"
                            class="${
                                String(
                                    x.cod_escola
                                )
                                ===
                                String(
                                    estado.escola
                                )
                                ?
                                    "escola-ativa"
                                :
                                    ""
                            }"
                        >

                            <td>
                                ${i + 1}
                            </td>

                            <td>
                                ${escapar(x.escola)}
                            </td>

                            <td>
                                ${escapar(x.municipio)}
                            </td>

                            <td>
                                ${escapar(x.dependencia)}
                            </td>

                            <td>
                                ${escapar(x.localizacao)}
                            </td>

                            <td class="numero">
                                ${pct(x[campo])}
                            </td>

                        </tr>

                        `
                    )
                    .join(
                        ""
                    )
                }

            </tbody>

        </table>
        `;


    container.querySelectorAll(
        "tbody tr[data-index]"
    )
    .forEach(
        tr => {

            tr.addEventListener(
                "click",
                () => {

                    const linha =
                        linhas[
                            Number(
                                tr.dataset.index
                            )
                        ];


                    if (!linha) {

                        return;
                    }


                    estado.escola =
                        String(
                            linha.cod_escola
                        );


                    container.querySelectorAll(
                        "tbody tr"
                    )
                    .forEach(
                        x =>
                            x.classList.remove(
                                "escola-ativa"
                            )
                    );


                    tr.classList.add(
                        "escola-ativa"
                    );


                    atualizarDonutEscola(
                        linha
                    );
                }
            );
        }
    );


    atualizarDonutEscola(
        selecionada
    );
}


function atualizarDonutEscola(
    linha
) {

    if (!linha) {

        document.getElementById(
            "tituloDonutEscola"
        ).textContent =
            "Nenhuma escola disponível";


        document.getElementById(
            "subtituloDonutEscola"
        ).textContent =
            "—";


        renderDonut(
            "graficoDonutEscola",
            "donutEscolaTexto",
            null,
            ""
        );


        return;
    }


    document.getElementById(
        "tituloDonutEscola"
    ).textContent =
        linha.escola;


    document.getElementById(
        "subtituloDonutEscola"
    ).textContent =
        (
            `${linha.municipio} · `
            +
            `${linha.dependencia} · `
            +
            `${linha.localizacao} · `
            +
            `${estado.ano}`
        );


    renderDonut(
        "graficoDonutEscola",
        "donutEscolaTexto",
        composicaoLinha(
            linha
        ),
        `${estado.ano}`
    );
}


// ==========================================================================================
// ABAS
// ==========================================================================================

async function ativarAba(
    aba
) {

    estado.aba =
        aba;


    document.querySelectorAll(
        ".aba-btn"
    )
    .forEach(
        btn => {

            btn.classList.toggle(
                "ativa",
                btn.dataset.tab
                ===
                aba
            );
        }
    );


    document.querySelectorAll(
        ".tab-content"
    )
    .forEach(
        secao => {

            secao.classList.toggle(
                "ativa",
                secao.id
                ===
                `tab-${aba}`
            );
        }
    );


    await atualizarAbaAtiva();


    if (
        aba
        ===
        "municipios"
        &&
        mapa
    ) {

        setTimeout(
            () =>
                mapa.invalidateSize(),
            100
        );
    }
}


// ==========================================================================================
// ATUALIZAÇÃO DA ABA
// ==========================================================================================

async function atualizarAbaAtiva() {

    status(
        "Atualizando..."
    );


    try {

        if (
            estado.aba
            ===
            "ufs"
        ) {

            atualizarUFs();
        }


        else if (
            estado.aba
            ===
            "municipios"
        ) {

            await atualizarMunicipios();
        }


        else if (
            estado.aba
            ===
            "escolas"
        ) {

            await atualizarEscolas();
        }


        status(
            "Dados carregados"
        );

    }

    catch (
        erro
    ) {

        console.error(
            erro
        );


        status(
            "Erro ao atualizar"
        );
    }
}


// ==========================================================================================
// ANIMAÇÃO - SEQUENCIAL
// ==========================================================================================

async function definirAno(
    ano
) {

    estado.ano =
        Number(
            ano
        );


    document.getElementById(
        "anoAtual"
    ).textContent =
        String(
            estado.ano
        );


    document.getElementById(
        "sliderAno"
    ).value =
        String(
            estado.ano
        );


    await atualizarAbaAtiva();
}


function pararPlay() {

    estado.tocando =
        false;


    document.getElementById(
        "btnPlay"
    ).textContent =
        "▶ Reproduzir";
}


async function executarPlay() {

    if (
        estado.tocando
    ) {

        pararPlay();

        return;
    }


    estado.tocando =
        true;


    document.getElementById(
        "btnPlay"
    ).textContent =
        "❚❚ Pausar";


    let ano =
        estado.ano;


    if (
        ano >= 2025
    ) {

        ano =
            2006;
    }


    while (
        estado.tocando
        &&
        ano < 2025
    ) {

        ano += 1;


        await definirAno(
            ano
        );


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    CONFIG.delayPlay
                )
        );
    }


    pararPlay();
}


// ==========================================================================================
// POPULAR SELECTS
// ==========================================================================================

function popularMunicipios() {

    const selectMun =
        document.getElementById(
            "filtroMunicipio"
        );


    const selectEsc =
        document.getElementById(
            "filtroMunicipioEscola"
        );


    for (
        const m
        of dados.dimMunicipios
    ) {

        const o1 =
            document.createElement(
                "option"
            );


        o1.value =
            String(
                m.codigo
            );


        o1.textContent =
            m.nome;


        selectMun.appendChild(
            o1
        );


        const o2 =
            document.createElement(
                "option"
            );


        o2.value =
            String(
                m.codigo
            );


        o2.textContent =
            m.nome;


        selectEsc.appendChild(
            o2
        );
    }
}


function popularComparadores() {

    const ufs =
        dados.brasilUfsTotal
        .filter(
            x =>
                Number(
                    x.ano
                )
                ===
                2025
                &&
                x.abrangencia
                ===
                "UF"
                &&
                x.codigo
                !==
                "RS"
        )
        .map(
            x => ({
                codigo:
                    x.codigo,

                nome:
                    x.nome
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                a.nome.localeCompare(
                    b.nome,
                    "pt-BR"
                )
        );


    for (
        const id
        of [
            "compararUF1",
            "compararUF2",
            "compararUF3"
        ]
    ) {

        const select =
            document.getElementById(
                id
            );


        select.innerHTML =
            `<option value="">Nenhuma</option>`;


        for (
            const uf
            of ufs
        ) {

            const o =
                document.createElement(
                    "option"
                );


            o.value =
                uf.codigo;


            o.textContent =
                uf.nome;


            select.appendChild(
                o
            );
        }


        select.addEventListener(
            "change",
            () => {

                if (
                    estado.aba
                    ===
                    "ufs"
                ) {

                    atualizarRankingUF();

                    atualizarComparacaoUF();
                }
            }
        );
    }


    document.getElementById(
        "compararUF1"
    ).value =
        "SC";


    document.getElementById(
        "compararUF2"
    ).value =
        "PR";


    document.getElementById(
        "compararUF3"
    ).value =
        "SP";
}


// ==========================================================================================
// EVENTOS
// ==========================================================================================

function configurarEventos() {

    document.querySelectorAll(
        ".aba-btn"
    )
    .forEach(
        btn => {

            btn.addEventListener(
                "click",
                async () => {

                    pararPlay();


                    await ativarAba(
                        btn.dataset.tab
                    );
                }
            );
        }
    );


    for (
        const [
            id,
            chave
        ]
        of [
            [
                "filtroResultado",
                "resultado"
            ],
            [
                "filtroEtapa",
                "etapa"
            ],
            [
                "filtroLocalizacao",
                "localizacao"
            ],
            [
                "filtroDependencia",
                "dependencia"
            ]
        ]
    ) {

        document.getElementById(
            id
        )
        .addEventListener(
            "change",
            async e => {

                pararPlay();


                estado[
                    chave
                ] =
                    e.target.value;


                await atualizarAbaAtiva();
            }
        );
    }


    const slider =
        document.getElementById(
            "sliderAno"
        );


    // durante arraste apenas altera o número
    slider.addEventListener(
        "input",
        e => {

            document.getElementById(
                "anoAtual"
            ).textContent =
                e.target.value;
        }
    );


    // calcula somente quando soltar
    slider.addEventListener(
        "change",
        async e => {

            pararPlay();


            await definirAno(
                e.target.value
            );
        }
    );


    document.getElementById(
        "btnPlay"
    )
    .addEventListener(
        "click",
        executarPlay
    );


    document.getElementById(
        "filtroMunicipio"
    )
    .addEventListener(
        "change",
        async e => {

            const codigo =
                e.target.value;


            if (!codigo) {

                estado.municipio =
                    null;


                estado.municipioNome =
                    null;


                document.getElementById(
                    "tituloMunicipioSelecionado"
                ).textContent =
                    "Selecione um município";


                document.getElementById(
                    "tituloDonutMunicipio"
                ).textContent =
                    "Selecione um município";


                await atualizarMunicipios();


                return;
            }


            const m =
                dados.dimMunicipios.find(
                    x =>
                        String(
                            x.codigo
                        )
                        ===
                        String(
                            codigo
                        )
                );


            await selecionarMunicipio(
                codigo,
                m?.nome
                ||
                codigo
            );
        }
    );


    document.getElementById(
        "filtroMunicipioEscola"
    )
    .addEventListener(
        "change",
        async e => {

            estado.municipioEscolas =
                e.target.value;


            estado.escola =
                null;


            await atualizarEscolas();
        }
    );
}


// ==========================================================================================
// INICIAR
// ==========================================================================================

async function iniciar() {

    status(
        "Carregando dados..."
    );


    try {

        const [
            meta,
            brasilUfsTotal,
            brasilUfsDetalhado,
            municipiosTotal,
            dimMunicipios,
            geojson
        ] =
        await Promise.all(
            [

                carregarJSON(
                    `${CONFIG.dados}/meta.json`
                ),

                carregarJSON(
                    `${CONFIG.dados}/brasil_ufs_total.json`
                ),

                carregarJSON(
                    `${CONFIG.dados}/brasil_ufs_detalhado.json`
                ),

                carregarJSON(
                    `${CONFIG.dados}/municipios_total.json`
                ),

                carregarJSON(
                    `${CONFIG.dados}/dim_municipios.json`
                ),

                carregarJSON(
                    `${CONFIG.dados}/mapa_rs_municipios.geojson`
                )

            ]
        );


        dados.meta =
            meta;

        dados.brasilUfsTotal =
            brasilUfsTotal;

        dados.brasilUfsDetalhado =
            brasilUfsDetalhado;

        dados.municipiosTotal =
            municipiosTotal;

        dados.dimMunicipios =
            dimMunicipios;

        dados.geojson =
            geojson;


        popularMunicipios();

        popularComparadores();

        configurarEventos();


        await ativarAba(
            "ufs"
        );


        status(
            "Dados carregados"
        );

    }

    catch (
        erro
    ) {

        console.error(
            erro
        );


        status(
            "Erro ao iniciar painel"
        );


        alert(
            erro.message
        );
    }
}


document.addEventListener(
    "DOMContentLoaded",
    iniciar
);
