/*
 * Copyright 2023 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Input or output data format specification for the cryptographic operation:
 * - `UTF8` - data is formatted as a plain string that will be converted into UTF-8 encoded sequence of bytes before the operation.
 * - `BASE64` - binary data encoded into Base64 string.
 */
export type PowerAuthDataFormat = 'UTF8' | 'BASE64'
