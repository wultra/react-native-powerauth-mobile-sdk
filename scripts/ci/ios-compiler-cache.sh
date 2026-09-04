#!/usr/bin/env bash
# Shared by the iOS E2E build and the cache benchmark.

configure_rn_compiler_cache() {
  if [ "${USE_CCACHE:-0}" != "1" ]; then
    return 0
  fi

  local ccache_binary cache_dir wrapper_dir compiler compiler_path
  ccache_binary="$(command -v ccache)" || {
    echo "[e2e] ERROR: USE_CCACHE=1 requires ccache to be installed."
    return 1
  }
  cache_dir="${CCACHE_DIR:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/ccache}"
  wrapper_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/powerauth-rn-compilers"
  mkdir -p "${wrapper_dir}"

  # Compiler tasks do not reliably inherit custom Xcode build settings or shell
  # variables. Bake the cache configuration into wrappers, with shell escaping.
  for compiler in clang clang++; do
    compiler_path="$(xcrun --find "${compiler}")"
    {
      echo '#!/usr/bin/env bash'
      # RNCConfig imports GeneratedDotEnv.m, which embeds the test credentials.
      # Compile it normally so those objects never enter the uploaded cache.
      echo 'for argument in "$@"; do'
      # Expanded by the generated wrapper, not by this setup script.
      # shellcheck disable=SC2016
      echo '  case "$argument" in'
      echo '    */react-native-config/*|*/react-native-config.build/*|*GeneratedDotEnv*|*GeneratedInfoPlistDotEnv*)'
      printf '      exec %q "$@" ;;\n' "${compiler_path}"
      echo '  esac'
      echo 'done'
      printf 'export CCACHE_DIR=%q\n' "${cache_dir}"
      printf 'export CCACHE_BASEDIR=%q\n' "${CCACHE_BASEDIR:-${PWD}}"
      printf 'export CCACHE_MAXSIZE=%q\n' "${CCACHE_MAXSIZE:-1G}"
      printf 'export CCACHE_COMPILERCHECK=%q\n' "${CCACHE_COMPILERCHECK:-content}"
      printf 'export CCACHE_CONFIGPATH=%q\n' "${PWD}/testapp/node_modules/react-native/scripts/xcode/ccache.conf"
      printf 'exec %q %q "$@"\n' "${ccache_binary}" "${compiler_path}"
    } > "${wrapper_dir}/${compiler}"
    chmod +x "${wrapper_dir}/${compiler}"
  done

  RN_BUILD_SETTINGS+=(
    "CC=${wrapper_dir}/clang" "CXX=${wrapper_dir}/clang++"
    "LD=${wrapper_dir}/clang" "LDPLUSPLUS=${wrapper_dir}/clang++"
  )
  echo "[e2e] Using compiler cache: ${cache_dir}"
}

