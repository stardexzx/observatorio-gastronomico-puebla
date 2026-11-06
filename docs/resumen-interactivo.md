# Gráficos interactivos del Resumen

El Resumen conserva su conjunto de datos de demostración existente; este cambio agrega exploración, sin modificar fichas ni la fuente de datos.

- Crecimiento: leyenda pulsable (conserva al menos una serie visible), selección de tramo desde/hasta, áreas o líneas, valores en tabla y restablecimiento local. El filtro general de categoría limita las series disponibles. Al cambiar de año se restablece el tramo para evitar índices fuera del rango.
- Composición: pulsar un segmento o su botón de leyenda aplica el filtro de categoría al contexto del Resumen; pulsar otra vez o usar el botón de restablecer lo retira. El anillo conserva el desglose general como contexto y destaca la selección; el centro muestra su valor. Los porcentajes usan el total del mismo municipio/periodo.
- Cobertura: los nombres de la tabla de concentración son botones para aplicar o quitar el filtro municipal. El mapa conserva su interacción existente.
- Calidad: pulsar un indicador muestra la distancia a la meta de 80%. Las miniaturas de indicadores muestran su valor al interactuar.
- Filtros activos: una banda ofrece retirar categoría, municipio o restablecer el resumen. El zoom y las series ocultas son exploración local del gráfico; las exportaciones conservan los filtros generales existentes.

Las series temporales se filtran por el año de cada punto, corrigiendo el recorte posicional anterior que mezclaba años en crecimiento. `node --test test/dashboard-view.test.mjs` comprueba fechas y coherencia de totales del desglose.

Revisión visual: escritorio y móvil, leyenda, tramo, tabla, selección y restablecimiento de categoría, detalle de calidad. Se usó una ruta temporal con el Resumen y una identidad ficticia, eliminada después de la revisión. Captura: `docs/resumen-interactivo.png`.

La navegación por flechas usa la capa accesible de Recharts 3: [documentación oficial de accesibilidad](https://github.com/recharts/recharts/blob/main/storybook/stories/API/Accessibility.mdx). La tabla y los botones de leyenda ofrecen alternativas al uso del cursor. Nuevos estilos aislados en `modules/dashboard/interactive-charts.module.css` y colores de la paleta del observatorio.

## Tarjeta Registros totales
La primera tarjeta es ahora un botón que abre un panel lateral con desglose por categoría. El total se obtiene de `view.distributionTotal`, de modo que coincide con la suma de las categorías visibles y con el gráfico de composición incluso al cambiar periodo o municipio. Se sustituyó la comparación porcentual fija de esta tarjeta por la acción «Explorar categorías». El resto de tarjetas conserva su comportamiento anterior en esta primera fase.

La tarjeta tiene elevación y borde al pasar el cursor o enfocar, transición numérica de 550 ms y una minigráfica histórica con fecha y valor acumulado al recorrerla. El valor final está disponible para lectores de pantalla sin anunciar cada fotograma. CSS y contador respetan `prefers-reduced-motion`. El panel contiene selector de categoría, cantidades, porcentajes y barras; los cambios actualizan el contexto existente del dashboard y conservan periodo y municipio. El panel usa Sheet de Radix para modalidad y controles de cierre.

Verificado visualmente en escritorio y móvil: apertura con Enter, selección de Recetas (582), restablecimiento de todas las categorías (1,246) y ajuste del panel al ancho móvil. Ruta temporal de revisión eliminada al terminar. Evidencia: `docs/registros-totales-interactivo.png`.
