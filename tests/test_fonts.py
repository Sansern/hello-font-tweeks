from io import BytesIO
import json
from pathlib import Path
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from fontTools.ttLib import TTFont
from server.app import app, LATIN, THAI, THAI_REQUIRED

client = TestClient(app)
ROOT = Path(__file__).resolve().parents[1]
THAI_BYTES = (ROOT / 'public/fonts/NotoSansThai.ttf').read_bytes()
LATIN_BYTES = (ROOT / 'public/fonts/Inter.ttf').read_bytes()

def config(**changes):
    return {'family': 'Test Project', 'faces': [
        {'script': 'thai', 'file_index': 0, 'scale': 105, 'override_metrics': True, 'ascent': 110, 'descent': 40, 'weight_min': 100, 'weight_max': 900},
        {'script': 'latin', 'file_index': 1, 'weight_min': 100, 'weight_max': 900},
    ], **changes}

def export(project=None):
    return client.post('/api/export', data={'config': json.dumps(project or config())}, files=[
        ('files', ('thai.ttf', THAI_BYTES, 'font/ttf')),
        ('files', ('latin.ttf', LATIN_BYTES, 'font/ttf')),
    ])

def test_inspect_real_thai_and_variable_axes():
    r = client.post('/api/inspect', files={'file': ('thai.ttf', THAI_BYTES)})
    assert r.status_code == 200
    data = r.json()
    assert data['name'] == 'Noto Sans Thai'
    assert data['thai_coverage'] == 100
    assert data['weight_min'] == 100 and data['weight_max'] == 900
    assert {'mark', 'mkmk'} <= set(data['features'])
    assert THAI_REQUIRED <= set(data['codepoints'])

def test_invalid_fonts_are_rejected():
    assert client.post('/api/inspect', files={'file': ('broken.ttf', b'not a font')}).status_code == 422
    assert client.post('/api/inspect', files={'file': ('empty.ttf', b'')}).status_code == 413

def test_css_matching_and_metrics():
    r = client.post('/api/stylesheet', json=config())
    assert r.status_code == 200
    css = r.json()['css']
    assert css.count('@font-face') == 2
    assert 'size-adjust: 105%' in css
    assert 'ascent-override: 110%' in css
    assert 'unicode-range: U+0E00-0E7F' in css
    assert 'font-weight: 100 900' in css

@pytest.mark.parametrize('family', ['</style>', 'x"; color:red;', 'ไทย', ''])
def test_family_validation(family):
    assert client.post('/api/stylesheet', json=config(family=family)).status_code == 422

def test_subset_export_retains_thai_shaping_and_variable_weight():
    r = export()
    assert r.status_code == 200, r.text
    with ZipFile(BytesIO(r.content)) as archive:
        assert {'fonts/thai.woff2', 'fonts/latin.woff2', 'fonts.css', 'font-tweeks.json', 'README.md'} <= set(archive.namelist())
        thai = TTFont(BytesIO(archive.read('fonts/thai.woff2')))
        latin = TTFont(BytesIO(archive.read('fonts/latin.woff2')))
        assert thai.flavor == 'woff2'
        assert THAI_REQUIRED <= set(thai.getBestCmap())
        assert set(thai.getBestCmap()) <= THAI
        assert set(latin.getBestCmap()) <= LATIN
        assert 'GSUB' in thai and 'GPOS' in thai and 'fvar' in thai
        features = {r.FeatureTag for r in thai['GPOS'].table.FeatureList.FeatureRecord}
        assert {'mark', 'mkmk'} <= features
        assert next(a for a in thai['fvar'].axes if a.axisTag == 'wght').maxValue == 900
        assert len(archive.read('fonts/thai.woff2')) < len(THAI_BYTES)
        assert archive.read('fonts.css').decode() == client.post('/api/stylesheet', json=config()).json()['css']
        assert 'SIL OPEN FONT LICENSE Version 1.1' in archive.read('licenses/thai.txt').decode()
        assert 'Copyright 2020 The Inter Project Authors' in archive.read('licenses/latin.txt').decode()

def test_full_export_keeps_original_coverage_and_can_be_reimported():
    r = export(config(subset=False))
    assert r.status_code == 200
    with ZipFile(BytesIO(r.content)) as archive:
        full = archive.read('fonts/latin.woff2')
        font = TTFont(BytesIO(full))
        original = TTFont(BytesIO(LATIN_BYTES))
        assert set(font.getBestCmap()) == set(original.getBestCmap())
        inspected = client.post('/api/inspect', files={'file': ('export.woff2', full)})
        assert inspected.status_code == 200
        assert inspected.json()['glyph_count'] == original['maxp'].numGlyphs

def test_static_woff_and_otf_inputs():
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.t2CharStringPen import T2CharStringPen
    builder = FontBuilder(1000, isTTF=False)
    builder.setupGlyphOrder(['.notdef', 'A'])
    builder.setupCharacterMap({65: 'A'})
    pen = T2CharStringPen(600, None)
    pen.moveTo((0, 0)); pen.lineTo((200, 600)); pen.lineTo((400, 0)); pen.closePath()
    builder.setupCFF('TestOTF', {'FullName': 'Test OTF', 'FamilyName': 'Test OTF', 'Weight': 'Regular'}, {'.notdef': T2CharStringPen(600, None).getCharString(), 'A': pen.getCharString()}, {})
    builder.setupHorizontalMetrics({'.notdef': (600, 0), 'A': (600, 0)})
    builder.setupHorizontalHeader(ascent=800, descent=-200)
    builder.setupNameTable({'familyName': 'Test OTF', 'styleName': 'Regular', 'uniqueFontIdentifier': 'TestOTF', 'fullName': 'Test OTF', 'psName': 'TestOTF'})
    builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    builder.setupPost()
    for flavor in (None, 'woff'):
        builder.font.flavor = flavor
        data = BytesIO(); builder.font.save(data)
        r = client.post('/api/inspect', files={'file': ('test.otf' if flavor is None else 'test.woff', data.getvalue())})
        assert r.status_code == 200, r.text
        assert r.json()['name'] == 'Test OTF'
        project = config(); project['faces'] = [{'script': 'latin', 'file_index': 0}]
        exported = client.post('/api/export', data={'config': json.dumps(project)}, files={'files': ('test.otf', data.getvalue())})
        assert exported.status_code == 200, exported.text
        with ZipFile(BytesIO(exported.content)) as archive:
            result = TTFont(BytesIO(archive.read('fonts/latin.woff2')))
            assert 'CFF ' in result
            assert 65 in result.getBestCmap()

def test_missing_file_and_duplicate_language_are_rejected():
    project = config(); project['faces'][1]['file_index'] = 9
    assert export(project).status_code == 422
    project = config(); project['faces'][1]['script'] = 'thai'
    assert export(project).status_code == 422

def test_restricted_font_cannot_be_exported():
    font = TTFont(BytesIO(THAI_BYTES)); font['OS/2'].fsType = 2
    data = BytesIO(); font.save(data)
    project = config(); project['faces'] = project['faces'][:1]
    r = client.post('/api/export', data={'config': json.dumps(project)}, files={'files': ('restricted.ttf', data.getvalue())})
    assert r.status_code == 422

def test_no_subsetting_flag_is_respected():
    font = TTFont(BytesIO(THAI_BYTES)); font['OS/2'].fsType = 0x0100
    data = BytesIO(); font.save(data)
    project = config(); project['faces'] = project['faces'][:1]
    files = {'files': ('no-subset.ttf', data.getvalue())}
    assert client.post('/api/export', data={'config': json.dumps(project)}, files=files).status_code == 422
    project['subset'] = False
    assert client.post('/api/export', data={'config': json.dumps(project)}, files=files).status_code == 200

def test_single_custom_font_exports_all_languages_without_pairing():
    project = config(faces=[{'script': 'custom', 'file_index': 0, 'scale': 108, 'weight_min': 100, 'weight_max': 900}])
    css = client.post('/api/stylesheet', json=project).json()['css']
    assert css.count('@font-face') == 1
    assert 'custom.woff2' in css and 'unicode-range' not in css
    r = export(project)
    assert r.status_code == 200
    with ZipFile(BytesIO(r.content)) as archive:
        assert [n for n in archive.namelist() if n.endswith('.woff2')] == ['fonts/custom.woff2']
        font = TTFont(BytesIO(archive.read('fonts/custom.woff2')))
        assert THAI_REQUIRED <= set(font.getBestCmap())
        assert set(range(32, 127)) <= set(font.getBestCmap())
        assert 'GPOS' in font and 'fvar' in font
        assert archive.read('fonts.css').decode() == css

def test_custom_font_cannot_be_combined_with_a_second_face():
    project = config()
    project['faces'][0]['script'] = 'custom'
    assert client.post('/api/stylesheet', json=project).status_code == 422
