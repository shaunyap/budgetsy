import os

path = './src/components/EnvelopeList.tsx'
with open(path, 'r') as f:
    content = f.read()

bad_chunk = """import React from 'react';

import { EnvelopeStat, DateMetrics } from '../types';"""

good_chunk = """import React from 'react';
import { Wallet } from 'lucide-react';
import { EnvelopeStat, DateMetrics } from '../types';"""

content = content.replace(bad_chunk, good_chunk)

with open(path, 'w') as f:
    f.write(content)
