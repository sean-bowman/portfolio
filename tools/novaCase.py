'''
The NOVA worked example, run for the portfolio exporters.

Both exporters in this folder draw on the same case: NOVA's shipped example configuration
(src/NOVA/assets/NOVANozzle.json, a 100 kN LOX/LH2 upper stage). This module runs it with figures
off under a separate output name, so the example's own outputs in NOVA/runs are left alone, or
loads the nozzle a previous run pickled.

Author: Sean Bowman
Date:   10/07/2026
'''

import json
import pickle
import sys
import tempfile
from pathlib import Path

siteRoot = Path(__file__).resolve().parents[1]
novaRoot = siteRoot.parent / 'NOVA'
workDir = Path(tempfile.gettempdir()) / 'novaShowcaseExport'
runName = 'portfolioShowcase'

def exampleConfig() -> dict:
    '''
    The worked example's configuration as shipped.

    Returns:
    --------
    dict
        Parsed NOVANozzle.json
    '''
    return json.loads((novaRoot / 'src' / 'NOVA' / 'assets' / 'NOVANozzle.json').read_text(encoding='utf-8'))

def readOption(node: dict, key: str):
    '''
    First value stored under key anywhere in a nested configuration, or None.
    '''
    if key in node:
        return node[key]
    for child in node.values():
        if isinstance(child, dict):
            found = readOption(child, key)
            if found is not None:
                return found
    return None

def setOption(node: dict, key: str, value) -> bool:
    '''
    Set key wherever it first appears in a nested configuration; False if it is absent.
    '''
    if key in node:
        node[key] = value
        return True
    return any(setOption(child, key, value) for child in node.values() if isinstance(child, dict))

def importNova():
    '''
    Put NOVA's source tree on the path and return its package.
    '''
    sys.path.insert(0, str(novaRoot / 'src'))
    import NOVA
    return NOVA

def runWorkedExample():
    '''
    Generate the worked-example nozzle with figures off and export on.

    Returns:
    --------
    tuple
        (nozzle, config): the solved NOVA Nozzle and the configuration it ran
    '''
    nova = importNova()
    workDir.mkdir(parents=True, exist_ok=True)
    config = exampleConfig()
    for key, value in (('plotsEnabled', False), ('export', True), ('filename', runName)):
        assert setOption(config, key, value), key
    configPath = workDir / f'{runName}.json'
    configPath.write_text(json.dumps(config, indent=2), encoding='utf-8')
    nozzle = nova.Nozzle()
    nozzle.generateNozzle(configPath=str(configPath))
    return nozzle, config

def loadPickledRun():
    '''
    The nozzle the last runWorkedExample() pickled, without solving again.

    Returns:
    --------
    tuple
        (nozzle, config)
    '''
    importNova()
    picklePath = novaRoot / 'runs' / f'{runName}Outputs' / f'{runName}.pkl'
    with open(picklePath, 'rb') as file:
        nozzle = pickle.load(file)
    return nozzle, exampleConfig()
