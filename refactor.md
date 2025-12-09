我想对这个项目进行重构，因为现有架构不是特别好，有以下问题：
1、后续拓展其他工具，如codebuddy-cli，需要改很多文件，希望达到增加一个tools，定义codebuddy-cli相关的方法就行
2、几个工具的行为没有统一，比如读写配置，切换服务商，mcp的管理等等
3、模板文件没有用起来，没有统一
4、ccman本身也会维护对应的服务商，mcp信息，其实和要管理的claude code，codex，gemini-cli等工具类似，所以希望抽离特效，然后来拓展成不同的工具实例


所以希望重构core部分，希望达到更好的拓展性，初步想法：
core需要实现统一的对外暴露：
1.服务商/增/删/改/复制/列表/应用
2.配置文件获取（路径和内容）
3.webdav相关操作
4.mcp增/删/改/应用
5.tools
 - ccman // ccman软件自身
 - claude-code // 简称cc
 - codex //简称cx
 - gemini-cli //简称gc
 - ...
 tools下的所有工具都可以抽象成，配置（读取，修改），服务商（列表，增，删，改，应用等），mcp（列表，增，删，改，应用等）

 core包的工具都应该有类似的方法
 import { Tool } from '@ccman/types'
 import { ccman, claudeCode, codex, geminiCli, webdav } from '@ccman/core'

// Tool是哪些工具，目前是claude code，codex，gemini cli，后续可能会拓展

// 下面是ccman工具的方法
ccman.listConfigPath(); //  { path1: '/xxx/aaa/cc/...', path2: '/xxx/aaa/ddd/...' }
ccman.getConfig(pathName?: string); // 这里的pathName对应上面的path1，path2，不传就是返回所有的内容，都是返回对象 { path1: {}, path2: {} }
ccman.updateConfig(pathName: string, data, options?: { mode?: 'new-override-old' | 'old-override-new' })
ccman.listService()
ccman.addService(name, data)
ccman.updateService(name, data)
ccman.deleteService(name)
ccman.listMcp()
ccman.addMcp(name, data)
ccman.updateMcp(name, data)
ccman.deleteMcp(name)

// 下面是claude code工具的方法
claudeCode.listConfigPath(); //  { path1: '/xxx/aaa/cc/...', path2: '/xxx/aaa/ddd/...' }
claudeCode.getConfig(pathName?: string); // 这里的pathName对应上面的path1，path2，不传就是返回所有的内容，都是返回对象 { path1: {}, path2: {} }
claudeCode.updateConfig(pathName: string, data, options?: { mode?: 'new-override-old' | 'old-override-new' })
claudeCode.listService()
claudeCode.applyService(toolname: Tool, name) // 这个是通过ccman来调用对应工具的方法，为什么呢，因为所有的工具是通过ccman来管理的，需要同时写ccman的配置数据和对应tool的数据
claudeCode.addService(name, data)
claudeCode.updateService(name, data)
claudeCode.deleteService(name)
claudeCode.listMcp()
claudeCode.addMcp(name, data)
claudeCode.updateMcp(name, data)
claudeCode.deleteMcp(name)

// codex，gemini cli工具也是这样

// 然后还提供一些管理方法，方便外部调用处理

// 设置某工具的服务商，mcp,为什么要通过ccman来设置，应该ccman工具就是统一的对这些工具进行管理，这就是这个工具的目的
// 还有就是管理的时候，ccman会记录一些信息，对应的工具配置也会发生变化
// 这些是外提供，外部可以直接调用的成品方法，相当于 在外部只需要处理好相应数据，调用这些方法就行
ccman.applyToolService(toolname: Tool, name) // 这个是通过ccman来调用对应工具的方法，为什么呢，因为所有的工具是通过ccman来管理的，需要同时写ccman的配置数据和对应tool的数据
ccman.addToolService(toolname: Tool, name, data) // 同上
ccman.updateToolService(toolname: Tool, name, data) // 同上
ccman.deleteToolService(toolname: Tool, name) // 同上
ccman.applyToolMcp(toolname: Tool, name) // 同上
ccman.addToolMcp(toolname: Tool, name) // 同上
ccman.updateToolMcp(toolname: Tool, name) // 同上
ccman.deleteToolMcp(toolname: Tool, name) // 同上

// 还有webdav的一些方法
webdav.test(options) //测试webdav是否能连接
webdav.upload() // 上传覆盖云端
webdav.download() // 下载覆盖本地，下载到本地，要自定切换对应的工具的服务商，如果云端配置有设置
webdav.merge() // 云端本地智能合并，合并后的配置如果有更新，需要同时更新云端和本地，相当于获取到本地和云端的配置进行合并，然后再调用upload和download方法

上述我都是说的很核心的方法，可能还需要一些细节或者方法需要拓展

然后我说的都是一些想法，包括方法名称都是随意取的，最终不一定这么取