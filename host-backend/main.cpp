#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <windows.h>

#include <iostream>
#include <string>
#include <unordered_map>
#include "httplib.h"

std::unordered_map<std::string, PROCESS_INFORMATION> g_sessions;

const std::string BASE_SESSION_DIR =
    R"(C:\Users\chaylon\Downloads\sexo10k_auth_base\sexo10k_auth\sessions)";

const std::string PCSX2_ORIGINAL_DIR =
    R"(C:\Users\chaylon\Desktop\ps2 emulator\pcsx2-v2.7.306-windows-x64-Qt)";

const std::string TEMPLATE_DIR =
    R"(C:\Users\chaylon\Downloads\sexo10k_auth_base\sexo10k_auth\host-backend\pcsx2-template)";

const std::string GAME_ISO =
    R"(C:\Users\chaylon\Desktop\ps2 emulator\jogo\FIFA Street 2 (USA) (En,Es)\FIFA Street 2 (USA) (En,Es).iso)";

void addCorsHeaders(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

void createDir(const std::string& path) {
    CreateDirectoryA(path.c_str(), NULL);
}

void copyFolder(const std::string& from, const std::string& to) {
    std::string cmd =
        "xcopy \"" + from + "\" \"" + to + "\" /E /I /Y >nul";

    system(cmd.c_str());
}

bool startGameForSession(const std::string& sessionId) {
    if (g_sessions.find(sessionId) != g_sessions.end()) {
        std::cout << "Sessao ja existe: " << sessionId << "\n";
        return false;
    }

    createDir(BASE_SESSION_DIR);

    std::string sessionDir = BASE_SESSION_DIR + "\\" + sessionId;
    std::string sessionPcsx2Dir = sessionDir + "\\pcsx2";

    createDir(sessionDir);
    createDir(sessionPcsx2Dir);

    // Copia o PCSX2 inteiro para a sessão
    copyFolder(PCSX2_ORIGINAL_DIR, sessionPcsx2Dir);

    // Copia a configuração pronta para dentro da pasta do PCSX2 da sessão
    copyFolder(TEMPLATE_DIR, sessionPcsx2Dir);

    std::string sessionExe = sessionPcsx2Dir + "\\pcsx2-qt.exe";

    std::string command =
        "\"" + sessionExe + "\" "
        "\"" + GAME_ISO + "\" "
        "-fullscreen "
        "-portable";

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
        &pi
    );

    if (!success) {
        std::cout << "Erro ao iniciar PCSX2: " << GetLastError() << "\n";
        return false;
    }

    g_sessions[sessionId] = pi;

    std::cout << "============================\n";
    std::cout << "PCSX2 iniciado\n";
    std::cout << "Session: " << sessionId << "\n";
    std::cout << "PID: " << pi.dwProcessId << "\n";
    std::cout << "Dir: " << sessionPcsx2Dir << "\n";
    std::cout << "Command: " << command << "\n";
    std::cout << "============================\n";

    return true;
}

bool stopGameForSession(const std::string& sessionId) {
    auto it = g_sessions.find(sessionId);

    if (it == g_sessions.end()) {
        std::cout << "Sessao nao encontrada: " << sessionId << "\n";
        return false;
    }

    PROCESS_INFORMATION pi = it->second;

    DWORD exitCode = 0;
    GetExitCodeProcess(pi.hProcess, &exitCode);

    if (exitCode == STILL_ACTIVE) {
        std::cout << "Matando sessionId: " << sessionId
                  << " PID: " << pi.dwProcessId << "\n";

        TerminateProcess(pi.hProcess, 0);
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    g_sessions.erase(it);

    return true;
}

int main() {
    httplib::Server server;

    server.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
        addCorsHeaders(res);
        res.status = 204;
    });

    server.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        addCorsHeaders(res);
        res.set_content("Host online", "text/plain");
    });

    server.Post("/play", [](const httplib::Request& req, httplib::Response& res) {
        addCorsHeaders(res);

        if (!req.has_param("sessionId")) {
            res.status = 400;
            res.set_content("Missing sessionId", "text/plain");
            return;
        }

        std::string sessionId = req.get_param_value("sessionId");

        bool started = startGameForSession(sessionId);

        if (!started) {
            res.status = 409;
            res.set_content("Game already running or failed to start", "text/plain");
            return;
        }

        res.set_content("Game started", "text/plain");
    });

    server.Post("/stop", [](const httplib::Request& req, httplib::Response& res) {
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

        res.set_content("Game stopped", "text/plain");
    });

    std::cout << "Host rodando em http://localhost:8080\n";
    server.listen("0.0.0.0", 8080);

    return 0;
}