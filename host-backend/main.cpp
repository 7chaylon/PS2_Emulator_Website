#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <windows.h>

#include <fstream>
#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <cstdlib>
#include <sstream>

#include "httplib.h"

std::unordered_map<std::string, PROCESS_INFORMATION> g_sessions;
std::string trim(const std::string &value)
{
    auto start = value.begin();

    while (start != value.end() && std::isspace(static_cast<unsigned char>(*start)))
    {
        start++;
    }

    auto end = value.end();

    do
    {
        end--;
    } while (std::distance(start, end) > 0 && std::isspace(static_cast<unsigned char>(*end)));

    return std::string(start, end + 1);
}

std::unordered_map<std::string, std::string> loadEnvFile(const std::string &filePath)
{
    std::unordered_map<std::string, std::string> values;

    std::ifstream file(filePath);

    if (!file.is_open())
    {
        std::cout << "Arquivo .env nao encontrado em: " << filePath << "\n";
        return values;
    }

    std::string line;

    while (std::getline(file, line))
    {
        line = trim(line);

        if (line.empty())
            continue;
        if (line[0] == '#')
            continue;

        size_t equalPos = line.find('=');

        if (equalPos == std::string::npos)
            continue;

        std::string key = trim(line.substr(0, equalPos));
        std::string value = trim(line.substr(equalPos + 1));

        if (
            value.size() >= 2 &&
            ((value.front() == '"' && value.back() == '"') ||
             (value.front() == '\'' && value.back() == '\'')))
        {
            value = value.substr(1, value.size() - 2);
        }

        values[key] = value;
    }

    return values;
}

std::string getConfigValue(
    const std::unordered_map<std::string, std::string> &config,
    const std::string &key,
    const std::string &fallback)
{
    const char *envValue = std::getenv(key.c_str());

    if (envValue && std::string(envValue).size() > 0)
    {
        return std::string(envValue);
    }

    auto it = config.find(key);

    if (it != config.end() && !it->second.empty())
    {
        return it->second;
    }

    return fallback;
}

// Pasta onde as sessões temporárias serão criadas.
// Pode ficar dentro do projeto porque está no .gitignore.
const auto HOST_CONFIG = loadEnvFile(".env");

const std::string BASE_SESSION_DIR = getConfigValue(
    HOST_CONFIG,
    "BASE_SESSION_DIR",
    R"(C:\Users\chaylon\Documents\Cleiton Rasta\sessions)");

const std::string PCSX2_ORIGINAL_DIR = getConfigValue(
    HOST_CONFIG,
    "PCSX2_ORIGINAL_DIR",
    R"(C:\Users\chaylon\Desktop\ps2 emulator\pcsx2-v2.7.306-windows-x64-Qt)");

const std::string TEMPLATE_DIR = getConfigValue(
    HOST_CONFIG,
    "TEMPLATE_DIR",
    R"(C:\Users\chaylon\Documents\Cleiton Rasta\host-backend\pcsx2-template)");

const int HOST_PORT = std::stoi(getConfigValue(
    HOST_CONFIG,
    "HOST_PORT",
    "8080"));

void addCorsHeaders(httplib::Response &res)
{
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

bool pathExists(const std::string &path)
{
    DWORD attributes = GetFileAttributesA(path.c_str());
    return attributes != INVALID_FILE_ATTRIBUTES;
}

void createDir(const std::string &path)
{
    CreateDirectoryA(path.c_str(), NULL);
}

void copyFolder(const std::string &from, const std::string &to)
{
    std::string cmd =
        "xcopy \"" + from + "\" \"" + to + "\" /E /I /Y >nul";

    system(cmd.c_str());
}

void createPortableIni(const std::string &pcsx2Dir)
{
    std::string portablePath = pcsx2Dir + "\\portable.ini";

    if (!pathExists(portablePath))
    {
        std::ofstream file(portablePath);
        file.close();
    }
}

bool startGameForSession(const std::string &sessionId, const std::string &gameIso)
{
    if (g_sessions.find(sessionId) != g_sessions.end())
    {
        std::cout << "Sessao ja existe: " << sessionId << "\n";
        return false;
    }

    if (!pathExists(PCSX2_ORIGINAL_DIR))
    {
        std::cout << "PCSX2_ORIGINAL_DIR nao existe:\n"
                  << PCSX2_ORIGINAL_DIR << "\n";
        return false;
    }

    if (!pathExists(TEMPLATE_DIR))
    {
        std::cout << "TEMPLATE_DIR nao existe:\n"
                  << TEMPLATE_DIR << "\n";
        return false;
    }

    if (!pathExists(gameIso))
    {
        std::cout << "ISO do jogo nao existe:\n"
                  << gameIso << "\n";
        return false;
    }
    createDir(BASE_SESSION_DIR);

    std::string sessionDir = BASE_SESSION_DIR + "\\" + sessionId;
    std::string sessionPcsx2Dir = sessionDir + "\\pcsx2";

    createDir(sessionDir);
    createDir(sessionPcsx2Dir);

    // Copia o PCSX2 inteiro para a sessão.
    copyFolder(PCSX2_ORIGINAL_DIR, sessionPcsx2Dir);

    // Copia a configuração pronta para dentro da pasta do PCSX2 da sessão.
    copyFolder(TEMPLATE_DIR, sessionPcsx2Dir);

    // Garante que o PCSX2 rode em modo portátil e use as configs da sessão.
    createPortableIni(sessionPcsx2Dir);

    std::string sessionExe = sessionPcsx2Dir + "\\pcsx2-qt.exe";

    if (!pathExists(sessionExe))
    {
        std::cout << "pcsx2-qt.exe nao encontrado na sessao:\n"
                  << sessionExe << "\n";
        return false;
    }

    std::string command =
        "\"" + sessionExe + "\" "
                            "\"" +
        gameIso + "\" "
                  "-fullscreen "
                  "-portable "
                  "-batch";

    STARTUPINFOA si{};
    si.cb = sizeof(si);

    PROCESS_INFORMATION pi{};

    BOOL success = CreateProcessA(
        NULL,
        command.data(),
        NULL,
        NULL,
        FALSE,
        CREATE_NEW_PROCESS_GROUP,
        NULL,
        sessionPcsx2Dir.c_str(),
        &si,
        &pi);

    if (!success)
    {
        std::cout << "Erro ao iniciar PCSX2: " << GetLastError() << "\n";
        return false;
    }

    g_sessions[sessionId] = pi;

    std::cout << "============================\n";
    std::cout << "PCSX2 iniciado\n";
    std::cout << "Session: " << sessionId << "\n";
    std::cout << "PID: " << pi.dwProcessId << "\n";
    std::cout << "Dir: " << sessionPcsx2Dir << "\n";
    std::cout << "ISO: " << gameIso << "\n";
    std::cout << "Command: " << command << "\n";
    std::cout << "============================\n";

    return true;
}
bool isSessionRunning(const std::string &sessionId)
{
    auto it = g_sessions.find(sessionId);

    if (it == g_sessions.end())
    {
        return false;
    }

    PROCESS_INFORMATION pi = it->second;

    DWORD exitCode = 0;

    if (!GetExitCodeProcess(pi.hProcess, &exitCode))
    {
        return false;
    }

    if (exitCode == STILL_ACTIVE)
    {
        return true;
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    g_sessions.erase(it);

    return false;
}

bool stopGameForSession(const std::string &sessionId)
{
    auto it = g_sessions.find(sessionId);

    if (it == g_sessions.end())
    {
        std::cout << "Sessao nao encontrada: " << sessionId << "\n";
        return false;
    }

    PROCESS_INFORMATION pi = it->second;

    DWORD exitCode = 0;
    GetExitCodeProcess(pi.hProcess, &exitCode);

    if (exitCode == STILL_ACTIVE)
    {
        std::cout << "Matando sessionId: " << sessionId
                  << " PID: " << pi.dwProcessId << "\n";

        TerminateProcess(pi.hProcess, 0);
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    g_sessions.erase(it);

    return true;
}

int main()
{
    httplib::Server server;

    server.Get("/status", [](const httplib::Request &req, httplib::Response &res)
               {
    addCorsHeaders(res);

    if (!req.has_param("sessionId")) {
        res.status = 400;
        res.set_content("{\"ok\":false,\"message\":\"Missing sessionId\"}", "application/json");
        return;
    }

    std::string sessionId = req.get_param_value("sessionId");

    bool running = isSessionRunning(sessionId);

    std::string json =
        std::string("{\"ok\":true,\"running\":") +
        (running ? "true" : "false") +
        "}";

    res.set_content(json, "application/json"); });

    server.Options(R"(.*)", [](const httplib::Request &, httplib::Response &res)
                   {
        addCorsHeaders(res);
        res.status = 204; });

    server.Get("/health", [](const httplib::Request &, httplib::Response &res)
               {
        addCorsHeaders(res);
        res.set_content("Host online", "text/plain"); });

    server.Post("/play", [](const httplib::Request &req, httplib::Response &res)
                {
        addCorsHeaders(res);

        if (!req.has_param("sessionId")) {
            res.status = 400;
            res.set_content("Missing sessionId", "text/plain");
            return;
        }

        if (!req.has_param("isoPath")) {
            res.status = 400;
            res.set_content("Missing isoPath", "text/plain");
            return;
        }

        std::string sessionId = req.get_param_value("sessionId");
        std::string isoPath = req.get_param_value("isoPath");

        bool started = startGameForSession(sessionId, isoPath);

        if (!started) {
            res.status = 409;
            res.set_content("Game already running or failed to start", "text/plain");
            return;
        }

        res.set_content("Game started", "text/plain"); });
    server.Post("/input", [](const httplib::Request &req, httplib::Response &res)
                {
    addCorsHeaders(res);

    std::string sessionId = req.get_param_value("sessionId");
    std::string ps2Button = req.get_param_value("ps2Button");
    std::string inputCode = req.get_param_value("inputCode");
    std::string state = req.get_param_value("state");

    if (sessionId.empty() || ps2Button.empty() || inputCode.empty() || state.empty()) {
        res.status = 400;
        res.set_content("{\"ok\":false,\"message\":\"Missing input data\"}", "application/json");
        return;
    }

    std::cout
        << "[INPUT] session=" << sessionId
        << " ps2Button=" << ps2Button
        << " inputCode=" << inputCode
        << " state=" << state
        << "\n";

    res.set_content("{\"ok\":true}", "application/json"); });
    server.Post("/webrtc/offer", [](const httplib::Request &req, httplib::Response &res)
                {
    addCorsHeaders(res);

    std::cout << "[WEBRTC] Offer recebida, mas WebRTC ainda nao implementado no host.\n";

    res.status = 501;
    res.set_content(
        "{\"ok\":false,\"message\":\"WebRTC ainda nao implementado no host.\"}",
        "application/json"
    ); });
    server.Post("/stop", [](const httplib::Request &req, httplib::Response &res)
                {
        addCorsHeaders(res);

        if (!req.has_param("sessionId")) {
            res.status = 400;
            res.set_content("Missing sessionId", "text/plain");
            return;
        }

        std::string sessionId = req.get_param_value("sessionId");

        std::cout << "STOP recebido: " << sessionId << "\n";

        bool stopped = stopGameForSession(sessionId);

        if (!stopped) {
            res.status = 404;
            res.set_content("Session not found", "text/plain");
            return;
        }

        res.set_content("Game stopped", "text/plain"); });

    std::cout << "Host rodando em http://localhost:" << HOST_PORT << "\n";
    server.listen("0.0.0.0", HOST_PORT);

    return 0;
}