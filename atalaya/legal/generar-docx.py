#!/usr/bin/env python3
"""Atalaya · Documento Word del contrato para el abogado (legal/CONTRATO-PARA-REVISION.docx)

Sale de la misma plantilla que usa la aplicación (legal/CONTRATO-PLANTILLA.md, a través de
js/intervencion/contrato-plantilla.js y del intérprete js/intervencion/contrato.js en modo «revisión»):
todos los bloques visibles, los condicionales con su nota «[Solo si …]» en cursiva y los campos variables
resaltados en amarillo con su nombre legible. Delante van una portada y las notas de CONTRATO-NOTAS-ABOGADO.md.

Uso:  node legal/generar-plantilla.mjs && python3 legal/generar-docx.py [--pdf]
      (--pdf convierte además el .docx a PDF con LibreOffice, si está instalado)
Necesita python-docx (pip install python-docx).
"""
import json
import os
import re
import shutil
import subprocess
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'legal', 'CONTRATO-PARA-REVISION.docx')
NOTAS = os.path.join(RAIZ, 'legal', 'CONTRATO-NOTAS-ABOGADO.md')
FECHA_TXT = '5 de noviembre de 2026'
GRIS = RGBColor(0x55, 0x55, 0x55)

# Bloques del contrato en modo revisión, con el mismo intérprete que la aplicación
NODE = r"""
const C = require(process.argv[1] + '/js/intervencion/contrato.js');
const P = require(process.argv[1] + '/js/intervencion/contrato-plantilla.js');
process.stdout.write(JSON.stringify({ version: P.version, fecha: P.fecha, bloques: C.documento(P, {}, { modo: 'revision' }) }));
"""


def bloques():
    r = subprocess.run(['node', '-e', NODE, RAIZ], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


# ---------- Formato básico ----------
def preparar(doc):
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21)
    sec.top_margin = sec.bottom_margin = Cm(2.5)
    sec.left_margin = sec.right_margin = Cm(2.5)
    st = doc.styles['Normal']
    st.font.name = 'Calibri'
    st.font.size = Pt(11)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.line_spacing = 1.15
    for n, tam in (('Heading 1', 14), ('Heading 2', 12), ('Heading 3', 11), ('Title', 24)):
        h = doc.styles[n]
        h.font.name = 'Calibri'
        h.font.size = Pt(tam)
        h.font.bold = True
        h.font.color.rgb = RGBColor(0x10, 0x13, 0x1a)
        rpr = h.element.get_or_add_rPr()
        fonts = rpr.find(qn('w:rFonts'))
        if fonts is None:
            fonts = OxmlElement('w:rFonts')
            rpr.append(fonts)
        for a in ('w:ascii', 'w:hAnsi', 'w:cs', 'w:eastAsia'):
            fonts.set(qn(a), 'Calibri')
        for a in ('w:asciiTheme', 'w:hAnsiTheme', 'w:cstheme', 'w:eastAsiaTheme'):
            if fonts.get(qn(a)) is not None:
                del fonts.attrib[qn(a)]
        h.paragraph_format.space_before = Pt(12 if n != 'Heading 3' else 9)
        h.paragraph_format.space_after = Pt(6)
        h.paragraph_format.keep_with_next = True


def campo_pagina(par, tipo):
    """Campo PAGE o NUMPAGES de Word."""
    r = par.add_run()
    for t, txt in (('begin', None), (None, tipo), ('separate', None), (None, None), ('end', None)):
        if t:
            e = OxmlElement('w:fldChar')
            e.set(qn('w:fldCharType'), t)
            r._r.append(e)
        elif txt:
            e = OxmlElement('w:instrText')
            e.set(qn('xml:space'), 'preserve')
            e.text = ' %s ' % txt
            r._r.append(e)
        else:
            e = OxmlElement('w:t')
            e.text = '1'
            r._r.append(e)
    r.font.size = Pt(9)
    return r


def pie(doc, version):
    for sec in doc.sections:
        p = sec.footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run('Contrato de consultoría · borrador para revisión jurídica · versión %s · página ' % version)
        r.font.size = Pt(9)
        r.font.color.rgb = GRIS
        campo_pagina(p, 'PAGE')
        r = p.add_run(' de ')
        r.font.size = Pt(9)
        r.font.color.rgb = GRIS
        campo_pagina(p, 'NUMPAGES')


def salto(doc):
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def sombra(celda, color):
    tcpr = celda._tc.get_or_add_tcPr()
    s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear')
    s.set(qn('w:color'), 'auto')
    s.set(qn('w:fill'), color)
    tcpr.append(s)


def sin_bordes(tabla):
    tblpr = tabla._tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for lado in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement('w:' + lado)
        e.set(qn('w:val'), 'nil')
        b.append(e)
    tblpr.append(b)


# ---------- Texto con formato ----------
def runs_md(par, texto, base=None):
    """Texto de las notas en markdown sencillo: **negrita** y `código`."""
    for seg in re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', texto):
        if not seg:
            continue
        if seg.startswith('**'):
            r = par.add_run(seg[2:-2])
            r.bold = True
        elif seg.startswith('`'):
            r = par.add_run(seg[1:-1])
            r.font.name = 'Consolas'
            r.font.size = Pt(10)
        else:
            r = par.add_run(seg)
        if base:
            base(r)


def runs_ct(par, runs):
    """Trozos de un bloque del contrato: negrita, campo resaltado o nota en cursiva."""
    for x in runs:
        r = par.add_run(x.get('t', ''))
        if x.get('b'):
            r.bold = True
        if x.get('falta'):
            r.font.highlight_color = WD_COLOR_INDEX.YELLOW
        if x.get('nota'):
            r.italic = True
            r.font.color.rgb = GRIS


# ---------- Portada ----------
def portada(doc, version):
    for _ in range(6):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Contrato de prestación de servicios de consultoría')
    r.bold = True
    r.font.size = Pt(24)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Borrador para revisión jurídica')
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(0xb4, 0x23, 0x23)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Versión %s · %s' % (version, FECHA_TXT))
    r.font.size = Pt(13)
    for _ in range(4):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('AKOMPANO GROUP, S.L. · Business Avance International Consulting')
    r.font.size = Pt(11)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Plantilla del módulo «Contrato» de Atalaya 360° (Auditoría integral, fase 2 «Propuesta y contrato»)')
    r.font.size = Pt(10)
    r.font.color.rgb = GRIS
    for _ in range(5):
        doc.add_paragraph()
    p = doc.add_paragraph()
    r = p.add_run('Cómo leer el contrato. ')
    r.bold = True
    p.add_run('Los ')
    r = p.add_run('[campos resaltados en amarillo]')
    r.font.highlight_color = WD_COLOR_INDEX.YELLOW
    p.add_run(' los rellena la aplicación con los datos de la propuesta aceptada, de la ficha del cliente y de la ficha del consultor. ')
    r = p.add_run('[Las notas en cursiva entre corchetes]')
    r.italic = True
    r.font.color.rgb = GRIS
    p.add_run(' indican los bloques que solo aparecen en algunos casos (por ejemplo, si se contrata un servicio) y las filas o líneas que se repiten. Aquí se ven todos a la vez. Las cláusulas y los apartados de los anexos se numeran solos al generar cada contrato.')
    salto(doc)


# ---------- Notas para el abogado (markdown sencillo) ----------
def notas(doc):
    with open(NOTAS, encoding='utf-8') as f:
        L = f.read().replace('\r\n', '\n').split('\n')
    i = 0
    while i < len(L):
        l = L[i]
        s = l.strip()
        if not s:
            i += 1
            continue
        if s.startswith('|'):
            filas = []
            while i < len(L) and L[i].strip().startswith('|'):
                c = [x.strip() for x in L[i].strip().strip('|').split('|')]
                if not all(re.match(r'^:?-{3,}:?$', x) for x in c):
                    filas.append(c)
                i += 1
            t = doc.add_table(rows=len(filas), cols=len(filas[0]))
            t.style = 'Table Grid'
            for fi, fila in enumerate(filas):
                for ci, txt in enumerate(fila):
                    cel = t.cell(fi, ci)
                    cel.text = ''
                    runs_md(cel.paragraphs[0], txt, (lambda r: setattr(r, 'bold', True)) if fi == 0 else None)
                    if fi == 0:
                        sombra(cel, 'EEEEEE')
            doc.add_paragraph()
            continue
        m = re.match(r'^(#{1,3})\s+(.*)$', s)
        if m:
            nivel = len(m.group(1))
            doc.add_heading(m.group(2), level=nivel)
            i += 1
            continue
        ind = len(l) - len(l.lstrip(' '))
        m = re.match(r'^(\d+)\.\s+(.*)$', s)
        if m:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.75 + ind * 0.25)
            p.paragraph_format.first_line_indent = Cm(-0.6)
            p.add_run(m.group(1) + '.\t')
            runs_md(p, m.group(2))
            i += 1
            continue
        m = re.match(r'^-\s+(.*)$', s)
        if m:
            p = doc.add_paragraph(style='List Bullet' if ind == 0 else 'List Bullet 2')
            p.paragraph_format.space_after = Pt(2)
            runs_md(p, m.group(1))
            i += 1
            continue
        txt = s
        i += 1
        while i < len(L) and L[i].strip() and not re.match(r'^\s*(-\s|\d+\.\s|#|\|)', L[i]):
            txt += ' ' + L[i].strip()
            i += 1
        p = doc.add_paragraph()
        if ind:
            p.paragraph_format.left_indent = Cm(0.75 + ind * 0.25)
        runs_md(p, txt)
    salto(doc)


# ---------- El contrato ----------
def contrato(doc, bls):
    for b in bls:
        t = b['tipo']
        if t == 'h1':
            h = doc.add_heading(level=1)
            h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            runs_ct(h, b['runs'])
        elif t == 'h2':
            h = doc.add_heading(level=2)
            if b.get('sin'):
                h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                h.add_run(b['num'] + ' ')
            runs_ct(h, b['runs'])
        elif t == 'h3':
            h = doc.add_heading(level=3)
            if b.get('num'):
                h.add_run(b['num'] + ' ')
            runs_ct(h, b['runs'])
        elif t == 'p':
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            if b.get('num'):
                p.paragraph_format.left_indent = Cm(0.7)
                p.paragraph_format.first_line_indent = Cm(-0.7)
                p.add_run(b['num'] + '\t')
            elif b.get('ind'):
                p.paragraph_format.left_indent = Cm(0.7)
            runs_ct(p, b['runs'])
        elif t == 'ul':
            for it in b['items']:
                p = doc.add_paragraph(style='List Bullet 2' if b.get('ind') else 'List Bullet')
                p.paragraph_format.space_after = Pt(2)
                runs_ct(p, it)
        elif t == 'nota':
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(3)
            runs_ct(p, b['runs'])
        elif t == 'salto':
            salto(doc)
        elif t == 'tabla':
            filas = b['filas']
            n = max(len(f) for f in filas)
            tb = doc.add_table(rows=len(filas), cols=n)
            tb.alignment = WD_TABLE_ALIGNMENT.CENTER
            if b.get('firmas'):
                sin_bordes(tb)
            else:
                tb.style = 'Table Grid'
            for fi, fila in enumerate(filas):
                for ci in range(n):
                    cel = tb.cell(fi, ci)
                    par = cel.paragraphs[0]
                    par.paragraph_format.space_after = Pt(2)
                    runs_ct(par, fila[ci] if ci < len(fila) else [])
                    if fi == 0:
                        for r in par.runs:
                            r.bold = True
                        if not b.get('firmas'):
                            sombra(cel, 'EEEEEE')
                    if b.get('firmas') and fi == len(filas) - 1:
                        par.paragraph_format.space_before = Pt(40)
            doc.add_paragraph()


def main():
    datos = bloques()
    doc = Document()
    preparar(doc)
    portada(doc, datos['version'])
    notas(doc)
    contrato(doc, datos['bloques'])
    pie(doc, datos['version'])
    doc.core_properties.title = 'Contrato de prestación de servicios de consultoría · borrador para revisión jurídica'
    doc.core_properties.author = 'AKOMPANO GROUP, S.L.'
    doc.core_properties.language = 'es-ES'
    doc.save(SALIDA)
    print('Escrito ' + SALIDA)
    if '--pdf' in sys.argv:
        so = shutil.which('soffice') or shutil.which('libreoffice')
        if not so:
            print('Sin LibreOffice: no se genera el PDF.')
            return
        dest = os.path.dirname(SALIDA)
        subprocess.run([so, '--headless', '--convert-to', 'pdf', '--outdir', dest, SALIDA], check=True, capture_output=True)
        print('Escrito ' + os.path.join(dest, 'CONTRATO-PARA-REVISION.pdf'))


if __name__ == '__main__':
    main()
