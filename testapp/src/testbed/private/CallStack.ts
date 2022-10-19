//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

export function parseRnCallStack(stack: string, padding: string = ""): string {
    const lines = stack.split('\n');
    if (lines.length == 0) {
        return '';
    }
    return lines
            .filter(line => line.length > 0 && line.startsWith('    at'))
            .map(line => `${padding} ${line}`).join('\n')
}