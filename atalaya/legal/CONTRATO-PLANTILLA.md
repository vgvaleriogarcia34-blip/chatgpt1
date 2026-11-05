# Contrato de prestación de servicios de consultoría · plantilla

Plantilla única del módulo «Contrato» de la Auditoría integral (fase 2, «Propuesta y contrato»). Atalaya la rellena con los datos de la propuesta aceptada y de la ficha de la empresa. El mismo texto se entrega al abogado para su validación (`CONTRATO-PARA-REVISION.docx`).

**Estado:** borrador completo pendiente de validación jurídica. No se usa con clientes hasta que el abogado lo apruebe y se anote aquí la fecha y la versión aprobada.

**Sintaxis de la plantilla** (la interpreta `js/intervencion/contrato.js`):
- `{{campo}}`: dato que rellena Atalaya.
- `{{#si campo}} … {{/si}}`: bloque que solo aparece si el dato existe o es verdadero. `{{#no campo}} … {{/no}}`: lo contrario.
- `{{#cada lista}} … {{/cada}}`: se repite por cada elemento; dentro, `{{.campo}}` es el dato del elemento.
- Las cláusulas y los anexos se numeran solos al generar el documento: en la plantilla se escriben con `##` (cláusula) y `###` (apartado de anexo).

---

<!-- PLANTILLA -->

# CONTRATO DE PRESTACIÓN DE SERVICIOS DE CONSULTORÍA EMPRESARIAL

Referencia: {{contrato.ref}}

En {{contrato.lugar}}, a {{contrato.fecha_larga}}.

## REUNIDOS

**De una parte**, {{consultor.razon}}, sociedad de nacionalidad española con domicilio social en {{consultor.domicilio}}, provista de NIF {{consultor.nif}}{{#si consultor.registro}}, inscrita en {{consultor.registro}}{{/si}}, que opera con el nombre comercial «{{consultor.marca}}». Interviene en su nombre y representación {{consultor.representante}}, en su condición de {{consultor.cargo}}, con facultades suficientes para este acto. En adelante, **«el Consultor»**.

**De otra parte**, {{cliente.razon}}, con domicilio social en {{cliente.domicilio}} y NIF {{cliente.nif}}{{#si cliente.registro}}, inscrita en {{cliente.registro}}{{/si}}. Interviene en su nombre y representación {{cliente.representante}}{{#si cliente.representante_doc}}, con documento de identidad {{cliente.representante_doc}}{{/si}}, en su condición de {{cliente.cargo}}, con facultades suficientes para este acto. En adelante, **«el Cliente»**.

El Consultor y el Cliente se denominan conjuntamente «las Partes» e individualmente «la Parte». Ambas se reconocen capacidad legal suficiente para obligarse y

## EXPONEN

I. Que el Consultor es una empresa dedicada a la consultoría de dirección para empresas familiares y pymes, especializada en el análisis económico y financiero, la estrategia, la organización y el acompañamiento en la implantación de decisiones, y que dispone de un método de trabajo propio y de la aplicación Atalaya 360° como herramienta de apoyo.

II. Que el Cliente es una empresa que desarrolla la actividad de {{cliente.actividad}} y que desea contar con los servicios profesionales del Consultor en los términos de este contrato.

III. Que, con fecha {{propuesta.fecha_larga}}, el Consultor presentó al Cliente la propuesta de servicios con referencia {{propuesta.ref}} (en adelante, «la Propuesta»), que el Cliente aceptó con fecha {{propuesta.aceptada_larga}}.

IV. Que el Cliente ha sido informado, antes de la firma, de la naturaleza de los servicios, de su alcance y de sus límites, y en particular de que se trata de servicios de consultoría que no sustituyen la auditoría de cuentas, el asesoramiento jurídico, fiscal o laboral ni la gestión de la empresa, que corresponde a sus órganos de administración.

Y, en virtud de lo expuesto, las Partes acuerdan formalizar el presente contrato de arrendamiento de servicios, que se regirá por las siguientes

## CLÁUSULAS

## Objeto

1. El objeto de este contrato es la prestación por el Consultor al Cliente de los servicios de consultoría empresarial descritos en el **Anexo I** (en adelante, «los Servicios»), con el alcance, los entregables y los plazos que allí se indican.

2. Los Servicios contratados son los siguientes:
{{#cada servicios}}
   - {{.nombre}}.
{{/cada}}

3. Cualquier servicio no incluido expresamente en el Anexo I queda fuera de este contrato y, si las Partes lo acuerdan, se contratará por escrito conforme a la cláusula de modificaciones.

## Documentos del contrato y orden de prevalencia

1. Forman parte de este contrato, y se firman con él:
   - Anexo I. Servicios contratados.
   - Anexo II. Honorarios y calendario de pagos.
   - Anexo III. Acuerdo de encargo del tratamiento de datos personales.
{{#si variable.on}}
   - Anexo IV. Componente de honorarios por objetivos.
{{/si}}

2. La Propuesta tiene carácter informativo y sirve para interpretar el alcance de los Servicios. En caso de contradicción prevalece, por este orden: el cuerpo de este contrato, sus anexos y la Propuesta.

## Duración y plazos

1. El contrato entra en vigor en la fecha de su firma y los Servicios comenzarán el {{contrato.inicio_largo}}.

2. El contrato estará vigente hasta la terminación de todos los Servicios contratados, cuyos plazos estimados se indican en el Anexo I. La duración prevista del conjunto es de {{contrato.duracion}}.
{{#si s3}}

3. El servicio de acompañamiento tiene la duración indicada en el Anexo I. Al terminar, podrá prorrogarse por periodos sucesivos de {{s3.prorroga_meses}} meses si ambas Partes lo acuerdan por escrito con al menos quince (15) días de antelación al vencimiento. Las condiciones económicas de cada prórroga serán las vigentes en la última factura, salvo acuerdo distinto.
{{/si}}

4. Los plazos de entrega dependen de que el Cliente aporte en tiempo y forma la documentación, la información y las reuniones que se indican en el Anexo I. Cualquier retraso imputable al Cliente amplía en el mismo tiempo los plazos del Consultor, sin penalización para este.

## Obligaciones del Consultor

El Consultor se obliga a:

a) Prestar los Servicios con la diligencia profesional propia de su actividad, conforme a su método de trabajo y a las buenas prácticas del sector.

b) Asignar a los Servicios personas con la cualificación adecuada. La dirección de los Servicios corresponde a {{consultor.director}}. El Consultor podrá incorporar a otros profesionales de su equipo o colaboradores, y responde de su trabajo como del propio.

c) Entregar los informes y documentos indicados en el Anexo I y presentarlos al Cliente en las reuniones previstas.

d) Informar al Cliente, con la periodicidad acordada, del avance de los Servicios y de cualquier circunstancia que pueda afectar a su desarrollo o a sus plazos.

e) Guardar la confidencialidad y cumplir la normativa de protección de datos en los términos de este contrato.

## Obligaciones del Cliente

El Cliente se obliga a:

a) Facilitar al Consultor, en los plazos acordados, la documentación y la información que se solicita en el Anexo I y cualquier otra razonablemente necesaria para prestar los Servicios, y garantizar que es veraz, completa y está actualizada. El Consultor no está obligado a verificar la exactitud de la información que recibe del Cliente ni de terceros a su cargo, salvo que el Servicio lo prevea expresamente.

b) Designar un interlocutor con capacidad de decisión y asegurar la asistencia de las personas de la empresa a las reuniones y sesiones previstas. Las sesiones anuladas con menos de cuarenta y ocho (48) horas de antelación se considerarán realizadas, salvo causa de fuerza mayor.

c) Tomar las decisiones que le correspondan y ejecutar las acciones que asuma en el plan de trabajo. La implantación de las medidas depende del Cliente.

d) Abonar los honorarios en los plazos y la forma previstos en el Anexo II.

e) Disponer de los permisos necesarios para entregar al Consultor la información de terceros (clientes, proveedores, trabajadores) que le facilite.

## Naturaleza de los Servicios

1. Los Servicios son de medios y no de resultado. El Consultor se compromete a prestarlos con la diligencia debida, pero no garantiza la obtención de un resultado económico, comercial o financiero concreto, que depende de decisiones del Cliente, de su ejecución y de factores ajenos al Consultor.

2. Las cifras, estimaciones, proyecciones y escenarios que el Consultor elabore son hipótesis de trabajo basadas en la información disponible en cada momento y no constituyen una promesa de resultados.

3. Las decisiones sobre la gestión de la empresa corresponden en exclusiva a sus órganos de administración. El Consultor no asume funciones de administración, dirección ni representación del Cliente.

4. Los Servicios **no incluyen**:
   - La auditoría de cuentas regulada en la Ley 22/2015, de 20 de julio, de Auditoría de Cuentas. La denominación «Auditoría 360» designa un diagnóstico de gestión y no una auditoría de cuentas.
   - El asesoramiento jurídico, fiscal, laboral o contable, ni la llevanza de la contabilidad, la confección de impuestos o la tramitación ante organismos.
   - La valoración de empresas con fines legales o la emisión de informes periciales.
   - La intermediación financiera o la obtención de financiación.

   Cuando los Servicios identifiquen cuestiones de esas materias, el Consultor lo indicará al Cliente para que las trate con sus asesores.

5. El Consultor podrá apoyarse en la aplicación Atalaya 360° y en herramientas de inteligencia artificial para el análisis y la preparación de documentos. Todo entregable es revisado y asumido por el equipo del Consultor antes de su entrega.

## Honorarios

1. Como contraprestación por los Servicios, el Cliente abonará al Consultor los honorarios indicados en el Anexo II, que ascienden a **{{honorarios.total}} ({{honorarios.total_letra}})**, más el impuesto sobre el valor añadido (IVA) al tipo vigente en cada momento, que a la fecha de este contrato es el {{honorarios.iva_tipo}} %.
{{#si variable.on}}

2. Del importe anterior, {{variable.importe}} ({{variable.pct}} %) tienen la consideración de componente por objetivos y se rigen por el Anexo IV. No es un importe adicional: forma parte de los honorarios totales.
{{/si}}

3. Los honorarios incluyen el trabajo del equipo del Consultor y el uso de la aplicación Atalaya 360° durante la vigencia del contrato. {{#si honorarios.gastos_incluidos}}Incluyen también los desplazamientos y gastos ordinarios de las sesiones presenciales en {{honorarios.ambito_gastos}}.{{/si}}{{#no honorarios.gastos_incluidos}}No incluyen los gastos de desplazamiento, alojamiento y manutención que requieran las sesiones presenciales fuera del término municipal del domicilio del Consultor, que se facturarán por su coste justificado previa aceptación del Cliente.{{/no}}

4. Los honorarios no incluyen los costes de terceros que el Cliente decida contratar (notarios, registros, tasaciones, asesores, licencias de programas, etc.).

## Facturación y forma de pago

1. El Consultor emitirá sus facturas conforme al calendario del Anexo II, cumpliendo el Reglamento de facturación (Real Decreto 1619/2012) y, cuando sea obligatoria, la normativa de factura electrónica.

2. El Cliente abonará cada factura en el plazo de {{pago.dias}} días naturales desde su recepción, mediante transferencia bancaria a la cuenta que figure en la factura{{#si pago.domiciliacion}} o mediante domiciliación bancaria si así lo autoriza{{/si}}.

3. Conforme a la Ley 3/2004, de 29 de diciembre, por la que se establecen medidas de lucha contra la morosidad en las operaciones comerciales, las cantidades no abonadas en plazo devengarán automáticamente, sin necesidad de aviso, el interés de demora previsto en su artículo 7, y el Consultor tendrá derecho a la indemnización por costes de cobro de su artículo 8.

4. Si el Cliente se retrasa más de treinta (30) días en el pago de una factura, el Consultor podrá suspender la prestación de los Servicios, previo aviso por escrito con siete (7) días de antelación, hasta que se abone lo debido. La suspensión no exime al Cliente del pago ni amplía los plazos a cargo del Consultor.

## Modificaciones y servicios adicionales

1. Cualquier modificación del alcance, los plazos o los honorarios se acordará por escrito, por correo electrónico con confirmación de ambas Partes o mediante adenda firmada.

2. Al terminar cada servicio, el Consultor podrá presentar la propuesta del siguiente. Su aceptación se formalizará como adenda a este contrato, que se regirá por estas mismas cláusulas.

## Confidencialidad

1. Cada Parte mantendrá en secreto la información de la otra a la que tenga acceso con motivo del contrato, sea económica, comercial, técnica, organizativa o personal (en adelante, «Información Confidencial»), no la usará para fines distintos del contrato y no la revelará a terceros sin consentimiento previo por escrito.

2. No es Información Confidencial la que: (i) sea de dominio público sin incumplimiento de este contrato; (ii) ya conociera legítimamente la Parte receptora; (iii) reciba de un tercero sin obligación de reserva; o (iv) deba revelarse por obligación legal o requerimiento de autoridad, en cuyo caso se comunicará antes a la otra Parte si la ley lo permite y se revelará solo lo imprescindible.

3. Cada Parte podrá compartir la Información Confidencial con su personal, colaboradores y asesores que necesiten conocerla para el contrato, siempre que estén sujetos a un deber de confidencialidad equivalente, y responderá de su cumplimiento.

4. Esta obligación se mantiene durante el contrato y durante los cinco (5) años siguientes a su terminación. Para los secretos empresariales, se mantiene mientras conserven ese carácter conforme a la Ley 1/2019, de 20 de febrero, de Secretos Empresariales.

5. El Consultor podrá citar al Cliente como referencia comercial solo con su autorización previa por escrito.

## Protección de datos personales

1. Las Partes cumplirán el Reglamento (UE) 2016/679 (Reglamento General de Protección de Datos, «RGPD») y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales («LOPDGDD»).

2. **Datos de los firmantes y de las personas de contacto.** Cada Parte tratará los datos de los representantes y personas de contacto de la otra como responsable del tratamiento, con la única finalidad de gestionar este contrato, sobre la base de su ejecución y del interés legítimo en mantener la relación (artículo 6.1.b y f del RGPD y artículo 19 de la LOPDGDD). Los datos se conservarán mientras dure el contrato y, después, durante los plazos de prescripción de las obligaciones legales. Los interesados pueden ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad dirigiéndose a la dirección de la otra Parte que figura en este contrato o, en el caso del Consultor, a {{consultor.email}}, y presentar una reclamación ante la Agencia Española de Protección de Datos. Cada Parte informará de esto a sus personas de contacto.

3. **Datos personales del Cliente que trata el Consultor.** Para prestar los Servicios, el Consultor accederá por cuenta del Cliente a datos personales de los que este es responsable (por ejemplo, de sus trabajadores, clientes o proveedores). Ese tratamiento se realiza en calidad de encargado del tratamiento y se rige por el **Anexo III**, que cumple el artículo 28 del RGPD.

## Uso de la aplicación Atalaya 360°

1. Durante la vigencia del contrato, el Consultor da acceso al Cliente a la aplicación Atalaya 360° para los usuarios que el Cliente designe, con el alcance que requieran los Servicios. El acceso es personal e intransferible y se rige, en lo no previsto aquí, por las condiciones de uso de la aplicación publicadas en su web.

2. Los datos que el Cliente introduzca o que se carguen en la aplicación con motivo de los Servicios son del Cliente. Al terminar el contrato, el Cliente podrá descargarlos o pedir su entrega en un formato de uso común durante los treinta (30) días siguientes, transcurridos los cuales se suprimirán conforme al Anexo III, salvo que el Cliente contrate el uso de la aplicación por separado.

3. El Cliente se compromete a hacer un uso adecuado de la aplicación y a custodiar las claves de acceso de sus usuarios.

## Propiedad intelectual e industrial

1. El método de trabajo del Consultor, sus herramientas, plantillas, modelos de análisis, cuestionarios, la aplicación Atalaya 360° y sus marcas, y todo el conocimiento previo o desarrollado con carácter general por el Consultor, son y seguirán siendo de su titularidad. Este contrato no transmite al Cliente ningún derecho sobre ellos, salvo el de uso previsto en este contrato.

2. Una vez abonados los honorarios correspondientes, el Cliente podrá usar libremente, para sus fines internos y sin límite de tiempo, los informes y documentos entregados (en adelante, «los Entregables»). El Cliente no podrá comercializarlos, publicarlos ni ponerlos a disposición de terceros ajenos a su empresa sin autorización del Consultor, salvo a sus asesores, financiadores, auditores o socios con fines relacionados con su actividad y con el deber de confidencialidad correspondiente.

3. Los datos, documentos y la información del Cliente siguen siendo de su titularidad.

4. El Consultor podrá usar, de forma agregada y anónima, el conocimiento y la experiencia adquiridos con los Servicios para mejorar su método y sus herramientas, sin revelar Información Confidencial del Cliente ni datos que permitan identificarlo.

## Responsabilidad

1. Cada Parte responde frente a la otra de los daños y perjuicios que le cause por incumplimiento de este contrato, conforme a la ley y a lo previsto en esta cláusula.

2. Salvo en caso de dolo o culpa grave, la responsabilidad total del Consultor derivada de este contrato, por cualquier concepto, se limita al importe de los honorarios efectivamente cobrados por el Servicio del que traiga causa el daño en los doce (12) meses anteriores al hecho que lo origine.

3. Salvo en caso de dolo o culpa grave, ninguna de las Partes responderá del lucro cesante, la pérdida de negocio u oportunidad ni de los daños indirectos.

4. El Consultor no responde de las consecuencias de decisiones adoptadas por el Cliente, aunque se basen en los Entregables, ni de los daños derivados de información inexacta o incompleta facilitada por el Cliente o por terceros a su cargo.
{{#si consultor.seguro}}

5. El Consultor declara tener contratado un seguro de responsabilidad civil profesional con {{consultor.seguro}}, que mantendrá durante la vigencia del contrato.
{{/si}}

## No captación de personal

Durante la vigencia del contrato y los doce (12) meses siguientes a su terminación, ninguna de las Partes contratará, directamente o a través de terceros, a personas de la otra Parte que hayan intervenido en los Servicios, ni les propondrá hacerlo, salvo acuerdo previo por escrito. Esta prohibición no impide la contratación de quien se presente por iniciativa propia a una oferta pública de empleo.

## Independencia de las Partes y colaboradores

1. Este contrato no crea entre las Partes relación laboral, societaria, de agencia ni de representación. El Consultor organiza su trabajo con autonomía y con sus propios medios, sin perjuicio de coordinarse con el Cliente en el calendario de sesiones.

2. El Consultor podrá contar con colaboradores para partes concretas de los Servicios, informando al Cliente. Seguirá siendo el único responsable frente al Cliente y trasladará a los colaboradores las obligaciones de confidencialidad y protección de datos de este contrato.

## Terminación anticipada

1. **Por incumplimiento.** Cualquiera de las Partes podrá resolver el contrato si la otra incumple una obligación esencial y no lo subsana en el plazo de quince (15) días naturales desde que se le requiera por escrito.

2. **Por desistimiento.** {{#si s3}}En el servicio de acompañamiento, cualquiera de las Partes podrá desistir comunicándolo por escrito con un preaviso de {{s3.preaviso_dias}} días naturales.{{/si}} En los demás Servicios, el Cliente podrá desistir en cualquier momento comunicándolo por escrito. En ambos casos el Cliente abonará los honorarios del trabajo realizado hasta la fecha de efectos{{#si pago.hitos}}, que incluyen los hitos ya iniciados por el importe que les corresponda en proporción al trabajo hecho{{/si}}{{#si pago.cuotas}}, que incluyen las cuotas devengadas hasta esa fecha y, si el desistimiento es del Cliente, la cuota del mes en curso{{/si}}, y los gastos aprobados ya incurridos.

3. **Por imposibilidad.** Si alguna de las Partes no pudiera continuar por fuerza mayor durante más de sesenta (60) días, cualquiera de ellas podrá resolver el contrato abonándose solo el trabajo realizado.

4. **Efectos.** Al terminar el contrato por cualquier causa: (i) el Consultor entregará los Entregables terminados y el trabajo en curso en el estado en que se encuentre, una vez abonado lo que corresponda; (ii) cada Parte devolverá o destruirá la Información Confidencial de la otra, salvo la que deba conservar por obligación legal; (iii) se aplicará lo previsto en la cláusula de uso de la aplicación y en el Anexo III sobre los datos. Las cláusulas de confidencialidad, protección de datos, propiedad intelectual, responsabilidad, no captación de personal, ley aplicable y jurisdicción seguirán vigentes tras la terminación.

## Fuerza mayor

Ninguna de las Partes será responsable del retraso o del incumplimiento debidos a sucesos imprevisibles o que, previstos, fueran inevitables, conforme al artículo 1105 del Código Civil. La Parte afectada lo comunicará a la otra en cuanto pueda, y los plazos se ampliarán por el tiempo que dure el impedimento.

## Comunicaciones

1. Las comunicaciones entre las Partes se harán por escrito a las direcciones siguientes, incluido el correo electrónico, que se considerará medio válido siempre que quede constancia de su envío y recepción:
   - Consultor: {{consultor.email}} · {{consultor.domicilio}}.
   - Cliente: {{cliente.email}} · {{cliente.domicilio}}.

2. Los requerimientos de resolución y de pago se enviarán además por un medio que deje constancia fehaciente de su recepción.

3. Cualquier cambio de dirección se comunicará por escrito a la otra Parte.

## Cesión

Ninguna de las Partes podrá ceder su posición en el contrato sin el consentimiento previo y por escrito de la otra, salvo el Consultor a una sociedad de su mismo grupo que asuma todas sus obligaciones, con aviso previo al Cliente.

## Firma electrónica y ejemplares

Las Partes podrán firmar este contrato y sus anexos de forma manuscrita, en dos ejemplares, o mediante firma electrónica conforme al Reglamento (UE) 910/2014 (eIDAS) y a la Ley 6/2020, de 11 de noviembre, reguladora de determinados aspectos de los servicios electrónicos de confianza. La firma electrónica tendrá la misma validez que la manuscrita.

## Disposiciones generales

1. Este contrato y sus anexos recogen todo lo acordado entre las Partes sobre su objeto y sustituyen cualquier acuerdo, oferta o comunicación anterior, salvo la Propuesta en los términos de la cláusula sobre documentos del contrato.

2. Si alguna estipulación resultara nula o inaplicable, el resto del contrato seguirá vigente y las Partes sustituirán la afectada por otra válida de efecto lo más parecido posible.

3. Que una Parte no exija en un momento el cumplimiento de una obligación no supone renuncia a exigirlo después.

4. Los títulos de las cláusulas son orientativos y no afectan a su interpretación.

## Ley aplicable y jurisdicción

1. Este contrato se rige por la ley española y, en particular, por los artículos 1544 y siguientes del Código Civil sobre el arrendamiento de servicios.

2. Las Partes intentarán resolver de buena fe cualquier discrepancia sobre el contrato mediante negociación directa durante un plazo de treinta (30) días desde que una de ellas la comunique por escrito.

3. Si no se resuelve, las Partes, con renuncia a cualquier otro fuero que pudiera corresponderles, se someten a los Juzgados y Tribunales de {{contrato.jurisdiccion}}.

Y, en prueba de conformidad, las Partes firman este contrato y sus anexos en el lugar y la fecha indicados al principio.

| Por el Consultor | Por el Cliente |
|---|---|
| {{consultor.razon}} | {{cliente.razon}} |
| {{consultor.representante}} · {{consultor.cargo}} | {{cliente.representante}} · {{cliente.cargo}} |
| Firma: | Firma: |

---

# ANEXO I · SERVICIOS CONTRATADOS

Este anexo describe cada Servicio contratado. Lo que no figure aquí queda fuera del contrato.

{{#si s1}}
### Servicio 1 · «¿Dónde está el dinero que gana la empresa?»

**Objeto.** Analizar la evolución económica y financiera del Cliente en los últimos ejercicios para explicar a dónde ha ido el beneficio que ha generado: clientes, existencias, inversiones, préstamos, retribución de los socios o tesorería.

**Alcance.**
- Análisis de las cuentas anuales de los últimos {{s1.ejercicios}} ejercicios y del año en curso.
- Reconstrucción, año a año, del destino del beneficio y de la variación de la tesorería.
- Análisis del dinero inmovilizado en el día a día (clientes, existencias y proveedores), del endeudamiento y de las inversiones.
- Identificación de las causas principales y de las primeras medidas.

**Documentación que debe aportar el Cliente.**
{{#cada s1.documentos}}
- {{.n}}: {{.d}}
{{/cada}}

**Entregables.**
- Informe «Dónde está su dinero», con las conclusiones y las medidas propuestas.
- Una sesión de presentación de resultados con la dirección del Cliente.
- Propuesta del siguiente servicio, si procede.

**Plazo estimado.** {{s1.plazo}} desde la recepción completa de la documentación.

**Honorarios.** {{s1.honorarios}}, según el Anexo II.
{{/si}}

{{#si s2}}
### Servicio 2 · Auditoría 360

**Objeto.** Elaborar un diagnóstico completo de la gestión del Cliente en seis bloques, de los datos a la operativa, para priorizar las decisiones que más pesan en sus resultados. No es una auditoría de cuentas.

**Alcance.** Diagnóstico de los seis bloques siguientes, con su valoración y sus causas:
{{#cada s2.bloques}}
- {{.n}}: {{.q}}
{{/cada}}

Incluye entrevistas con la dirección y con los responsables que el Cliente designe, la revisión de la documentación aportada y, en su caso, cuestionarios a personas de la empresa.

**Documentación que debe aportar el Cliente.** La que el Consultor solicite por escrito al inicio del servicio, según los bloques, en un plazo máximo de {{s2.dias_documentacion}} días desde la solicitud.

**Entregables.**
- Informe de la Auditoría 360 con la foto de los seis bloques, las desviaciones detectadas y las prioridades.
- Una sesión de presentación de resultados con la dirección del Cliente.
- Propuesta de acompañamiento, si procede.

**Plazo estimado.** {{s2.plazo}} desde el inicio del servicio.

**Honorarios.** {{s2.honorarios}}, según el Anexo II.
{{/si}}

{{#si s3}}
### Servicio 3 · Acompañamiento

**Objeto.** Acompañar a la dirección del Cliente en la implantación de las prioridades acordadas, mediante objetivos medibles y sesiones de trabajo periódicas.

**Alcance.**
- Sesión de arranque para fijar las reglas de trabajo, los responsables y el método.
- Definición, con la dirección, de los objetivos específicos, medibles, alcanzables, relevantes y con plazo (objetivos SMART) y del plan de acción por prioridades.
- {{s3.sesiones}} sesiones de trabajo de {{s3.duracion_sesion}}, con periodicidad {{s3.periodicidad}}, {{s3.modalidad}}.
- Seguimiento de los acuerdos de cada sesión y del avance de los objetivos en la aplicación Atalaya 360°.
- Disponibilidad por correo electrónico entre sesiones para consultas sobre el plan, con respuesta en un plazo de {{s3.respuesta_horas}} horas laborables.

**Entregables.**
- Acta breve de cada sesión con los acuerdos y sus responsables.
- Informe de seguimiento {{s3.informe_periodicidad}}.
- Informe de cierre con los resultados obtenidos y las recomendaciones.

**Duración.** {{s3.meses}} meses desde la sesión de arranque.

**Honorarios.** {{s3.honorarios}}, según el Anexo II.
{{/si}}

---

# ANEXO II · HONORARIOS Y CALENDARIO DE PAGOS

**Modalidad:** {{pago.modalidad}}.

| Concepto | Vencimiento | Importe (sin IVA) |
|---|---|---|
{{#cada pago.tabla}}
| {{.concepto}} | {{.vencimiento}} | {{.importe}} |
{{/cada}}
| **Total** | | **{{honorarios.total}}** |

{{#si honorarios.descuentos}}
El total incluye los descuentos siguientes:
{{#cada honorarios.descuentos}}
- {{.t}}: − {{.importe}}.
{{/cada}}
{{/si}}

A los importes se añadirá el IVA vigente en cada momento. Cada factura se abonará en el plazo de {{pago.dias}} días naturales desde su recepción.

---

# ANEXO III · ACUERDO DE ENCARGO DEL TRATAMIENTO DE DATOS PERSONALES

En cumplimiento del artículo 28 del RGPD y del artículo 33 de la LOPDGDD, el Cliente (en este anexo, «el Responsable») y el Consultor (en este anexo, «el Encargado») acuerdan lo siguiente.

### 1. Objeto, naturaleza y finalidad

El Encargado tratará por cuenta del Responsable los datos personales necesarios para prestar los Servicios. El tratamiento consistirá en la recogida, registro, consulta, análisis, estructuración, conservación y, al final, devolución o supresión de los datos, con la única finalidad de prestar los Servicios.

### 2. Duración

Este acuerdo dura lo mismo que el contrato. Al terminar, se aplicará el apartado 11.

### 3. Tipos de datos y categorías de interesados

- **Interesados:** personas de la plantilla del Responsable, socios y administradores, y personas de contacto de sus clientes y proveedores.
- **Datos:** identificativos y de contacto; datos profesionales y de puesto; datos económicos vinculados a la relación con la empresa (por ejemplo, retribuciones agregadas o saldos de clientes y proveedores); y, en los servicios que incluyan cuestionarios de comportamiento o de equipo, las respuestas a esos cuestionarios.
- El Encargado no tratará categorías especiales de datos (artículo 9 del RGPD), salvo instrucción expresa y documentada del Responsable con las garantías que procedan. El Responsable no facilitará esos datos si no son imprescindibles.

### 4. Obligaciones del Encargado

El Encargado se obliga a:

a) Tratar los datos solo siguiendo las instrucciones documentadas del Responsable, que son las de este contrato y las que el Responsable le dé por escrito. Si considera que una instrucción infringe la normativa, lo comunicará de inmediato al Responsable.

b) No usar los datos para fines propios ni distintos de los Servicios.

c) Garantizar que las personas autorizadas para tratar los datos se han comprometido a respetar su confidencialidad o están sujetas a una obligación legal de confidencialidad.

d) Aplicar las medidas técnicas y organizativas apropiadas del artículo 32 del RGPD, que incluyen como mínimo: control de acceso con usuario y contraseña individuales y segundo factor para la administración; cifrado de las comunicaciones; copias de seguridad periódicas cifradas; permisos de acceso limitados a quien los necesita; registro de los accesos de administración; y procedimientos para restablecer la disponibilidad y el acceso a los datos tras un incidente.

e) Llevar el registro de actividades de tratamiento que efectúa por cuenta del Responsable (artículo 30.2 del RGPD).

f) Asistir al Responsable, teniendo en cuenta la naturaleza del tratamiento, para responder a las solicitudes de ejercicio de derechos de los interesados. Si un interesado se dirige al Encargado, este lo trasladará al Responsable en un plazo máximo de cinco (5) días hábiles.

g) Ayudar al Responsable a cumplir sus obligaciones de seguridad, de notificación de violaciones de seguridad, de evaluación de impacto y de consulta previa (artículos 32 a 36 del RGPD), con la información de que disponga.

h) Notificar al Responsable, sin dilación indebida y en un plazo máximo de cuarenta y ocho (48) horas desde que tenga conocimiento, cualquier violación de la seguridad de los datos, con la información prevista en el artículo 33.3 del RGPD.

i) Poner a disposición del Responsable la información necesaria para demostrar el cumplimiento de este anexo y permitir y contribuir a las auditorías e inspecciones del Responsable o de un auditor que este designe, con un preaviso de quince (15) días y sin afectar a la confidencialidad de otros clientes.

j) Designar un delegado de protección de datos si está obligado, y comunicar su identidad al Responsable.

### 5. Subencargados

1. El Responsable autoriza de forma general al Encargado a recurrir a otros encargados (subencargados) para servicios auxiliares necesarios para los Servicios. A la fecha de firma son los siguientes:

{{#cada subencargados}}
   - {{.n}}: {{.servicio}}. Ubicación de los datos: {{.ubicacion}}.
{{/cada}}

2. El Encargado informará al Responsable de cualquier cambio previsto en esta lista con al menos quince (15) días de antelación. El Responsable podrá oponerse por motivos razonables relacionados con la protección de datos; si las Partes no llegan a un acuerdo, el Responsable podrá resolver el contrato sin penalización.

3. El Encargado impondrá a cada subencargado, por contrato, las mismas obligaciones de protección de datos que este anexo, y seguirá respondiendo ante el Responsable de su cumplimiento.

### 6. Transferencias internacionales

El Encargado solo transferirá datos fuera del Espacio Económico Europeo a países con decisión de adecuación de la Comisión Europea (incluido el Marco de Privacidad de Datos UE-EE. UU. para las entidades adheridas) o con las garantías adecuadas del artículo 46 del RGPD, como las cláusulas contractuales tipo aprobadas por la Comisión. Informará al Responsable de las transferencias y de la garantía aplicada en la lista de subencargados.

### 7. Uso de herramientas de inteligencia artificial

Cuando el Encargado use servicios de inteligencia artificial para analizar documentos o preparar Entregables, lo hará con proveedores que figuren en la lista de subencargados, en modalidades en las que el proveedor no use los datos para entrenar sus modelos, y limitará los datos personales enviados a los imprescindibles, eliminándolos o seudonimizándolos cuando el análisis no los requiera.

### 8. Obligaciones del Responsable

El Responsable garantiza que los datos que entrega se han obtenido lícitamente, que ha informado a los interesados conforme a los artículos 13 y 14 del RGPD, incluido que sus datos podrán ser tratados por un encargado para servicios de consultoría, y que cuenta con base jurídica para el tratamiento. Supervisará el tratamiento y dará al Encargado las instrucciones necesarias.

### 9. Secreto

El deber de confidencialidad del Encargado y de su personal sobre los datos se mantiene después de terminar el contrato.

### 10. Responsabilidad

Si el Encargado destina los datos a otra finalidad, los comunica o los usa incumpliendo este anexo, será considerado responsable del tratamiento a esos efectos y responderá de las infracciones en que haya incurrido personalmente (artículo 28.10 del RGPD).

### 11. Destino de los datos al terminar

Al terminar los Servicios, y en el plazo de treinta (30) días, el Encargado devolverá al Responsable los datos personales y los soportes en que consten, en un formato de uso común, y después los suprimirá, incluidas las copias, salvo que una norma exija conservarlos. En ese caso los conservará bloqueados mientras puedan derivarse responsabilidades. Las copias de seguridad se suprimirán en su ciclo ordinario de rotación, que no excederá de {{rgpd.dias_copias}} días. A petición del Responsable, el Encargado certificará la supresión.

{{#si variable.on}}
---

# ANEXO IV · COMPONENTE DE HONORARIOS POR OBJETIVOS

### 1. Importe

El {{variable.pct}} % de los honorarios totales, es decir, {{variable.importe}} sin IVA, se liquida según el grado de cumplimiento de los objetivos de este anexo. No es un importe adicional a los honorarios totales.

### 2. Objetivos, pesos e importes

| Objetivo | Indicador y meta | Peso | Importe máximo |
|---|---|---|---|
{{#cada variable.objetivos}}
| {{.t}} | {{.indicador}} | {{.peso}} % | {{.importe}} |
{{/cada}}

### 3. Validación de los objetivos

En la sesión de arranque, las Partes validarán por escrito cada objetivo: su indicador, el valor de partida, la meta, la fuente del dato y la fecha de medición. Los objetivos se refieren a acciones cuya ejecución depende del Cliente. Si en la sesión de arranque las Partes acuerdan modificar algún objetivo, el nuevo sustituirá al anterior con el mismo peso.

### 4. Medición y acreditación

El cumplimiento se medirá en la fecha de cierre del servicio con los datos de la fuente acordada. El Cliente facilitará esos datos en un plazo de quince (15) días desde la fecha de cierre. Para cada objetivo se liquidará el importe según los tramos validados en la sesión de arranque; a falta de tramos, el importe se devengará en proporción al grado de cumplimiento, con un máximo del 100 %.

### 5. Reglas especiales

a) Si el Cliente no ejecuta las acciones que le corresponden según el plan acordado, no facilita los datos para medir el objetivo en el plazo previsto o decide no seguir con el objetivo, el importe de ese objetivo se devengará íntegramente.

b) Si el objetivo no puede cumplirse por fuerza mayor o por causas ajenas a ambas Partes, las Partes acordarán de buena fe ajustar la meta o el plazo.

c) Si el contrato termina antes de la fecha de cierre por desistimiento del Cliente o por incumplimiento suyo, se devengará la totalidad del componente por objetivos. Si termina por incumplimiento del Consultor, solo se devengará lo cumplido a la fecha de terminación.

### 6. Facturación

El componente por objetivos se facturará en los quince (15) días siguientes a la medición y se abonará en el plazo general del contrato.
{{/si}}

<!-- /PLANTILLA -->
