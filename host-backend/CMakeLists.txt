cmake_minimum_required(VERSION 3.10)

project(ps2_host)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(host main.cpp)

target_link_libraries(host PRIVATE ws2_32 shell32)